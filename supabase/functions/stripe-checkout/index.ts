// Start a Stripe Checkout Session for a doctor subscribing to the SaaS.
//
// Flow:
//   1. Verify JWT (verify_jwt = true in config.toml).
//   2. Ensure a tenant exists for this user; create it (with the provided
//      practice name) if not.
//   3. Ensure a Stripe Customer exists; create it if not.
//   4. Create a Checkout Session in `subscription` mode with a 14-day trial
//      and return its URL for the client to redirect to.
//
// Tenant metadata sent to Stripe: {tenant_id, user_id}. Never PHI.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.24.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import {
    getCorsHeaders,
    getUserEmailFromJwt,
    getUserIdFromJwt,
    jsonResponse,
    originAllowed,
} from "../_shared/cors.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID_DOCTOR_MONTHLY");
const APP_URL = Deno.env.get("APP_URL") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID || !APP_URL || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("stripe-checkout missing required env vars");
}

const stripe = STRIPE_SECRET_KEY
    ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() })
    : null;

const admin = SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

const MAX_NAME_LENGTH = 120;

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    if (!originAllowed(req)) return jsonResponse({ error: "Origin not allowed" }, 403, corsHeaders);
    if (!stripe || !admin) return jsonResponse({ error: "Service unavailable" }, 503, corsHeaders);

    const userId = getUserIdFromJwt(req);
    const email = getUserEmailFromJwt(req);
    if (!userId || !email) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

    let body: { practice_name?: unknown };
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }
    const practiceName = typeof body.practice_name === "string" ? body.practice_name.trim() : "";
    if (practiceName.length === 0 || practiceName.length > MAX_NAME_LENGTH) {
        return jsonResponse({ error: "practice_name is required (1-120 chars)" }, 400, corsHeaders);
    }

    // 1. Find or create tenant.
    const { data: existingTenant, error: tenantQueryErr } = await admin
        .from("tenants")
        .select("id")
        .eq("owner_user_id", userId)
        .maybeSingle();
    if (tenantQueryErr) {
        console.error("tenant query failed:", tenantQueryErr.message);
        return jsonResponse({ error: "Failed to load tenant" }, 500, corsHeaders);
    }

    let tenantId: string;
    if (existingTenant) {
        tenantId = existingTenant.id;
    } else {
        const { data: newTenant, error: insertErr } = await admin
            .from("tenants")
            .insert({ owner_user_id: userId, name: practiceName })
            .select("id")
            .single();
        if (insertErr || !newTenant) {
            console.error("tenant insert failed:", insertErr?.message);
            return jsonResponse({ error: "Failed to create tenant" }, 500, corsHeaders);
        }
        tenantId = newTenant.id;
        const { error: mapErr } = await admin
            .from("user_tenants")
            .insert({ user_id: userId, tenant_id: tenantId, role: "doctor" });
        if (mapErr) {
            console.error("user_tenants insert failed:", mapErr.message);
            return jsonResponse({ error: "Failed to register doctor" }, 500, corsHeaders);
        }
    }

    // 2. Find or create Stripe customer (reuse from existing subscriptions row if present).
    const { data: existingSub } = await admin
        .from("subscriptions")
        .select("stripe_customer_id, status")
        .eq("tenant_id", tenantId)
        .maybeSingle();

    if (existingSub && ["active", "trialing"].includes(existingSub.status)) {
        return jsonResponse({ error: "Subscription already active" }, 409, corsHeaders);
    }

    let customerId = existingSub?.stripe_customer_id;
    if (!customerId) {
        const customer = await stripe.customers.create({
            email,
            metadata: { tenant_id: tenantId, user_id: userId },
        });
        customerId = customer.id;
    }

    // Persist the customer id immediately so sync-subscription can find this
    // tenant's Stripe state without a webhook ever firing.
    const { error: stubErr } = await admin
        .from("subscriptions")
        .upsert(
            {
                tenant_id: tenantId,
                stripe_customer_id: customerId,
                status: existingSub?.status ?? "incomplete",
                updated_at: new Date().toISOString(),
            },
            { onConflict: "tenant_id" },
        );
    if (stubErr) {
        console.error("subscriptions stub upsert failed:", stubErr.message);
        // non-fatal — checkout still works, sync-subscription has a fallback
    }

    // 3. Create the Checkout Session.
    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
        subscription_data: {
            trial_period_days: 14,
            metadata: { tenant_id: tenantId, user_id: userId },
        },
        allow_promotion_codes: true,
        success_url: `${APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/billing/cancel`,
        client_reference_id: tenantId,
    });

    return jsonResponse({ url: session.url }, 200, corsHeaders);
});
