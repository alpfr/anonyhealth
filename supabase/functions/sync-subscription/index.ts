// Pull the caller's subscription state from Stripe and upsert the local
// `subscriptions` row. Replaces webhook-driven sync as the primary
// mechanism: client polls this on /billing/success, on the BillingInactive
// "I've reactivated" button, and from the doctor dashboard if state ever
// looks stale.
//
// No Stripe SDK — direct fetch() to api.stripe.com keeps the bundle small
// and avoids the esm.sh runtime issues seen in stripe-webhook.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { getCorsHeaders, getUserIdFromJwt, jsonResponse, originAllowed } from "../_shared/cors.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const admin = SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

interface StripeSubscription {
    id: string;
    status: string;
    customer: string;
    items: { data: Array<{ price?: { id?: string } }> };
    current_period_end?: number;
    cancel_at?: number | null;
    trial_end?: number | null;
}

async function fetchLatestSubscription(customerId: string): Promise<StripeSubscription | null> {
    const url = `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=all&limit=1`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    if (!res.ok) {
        throw new Error(`stripe API error ${res.status}: ${await res.text()}`);
    }
    const body = await res.json();
    return (body.data?.[0] as StripeSubscription) ?? null;
}

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    if (!originAllowed(req)) return jsonResponse({ error: "Origin not allowed" }, 403, corsHeaders);
    if (!admin || !STRIPE_SECRET_KEY) return jsonResponse({ error: "Service unavailable" }, 503, corsHeaders);

    const userId = getUserIdFromJwt(req);
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

    // Find tenant + customer id for this user (must be the tenant owner).
    const { data: tenant, error: tenantErr } = await admin
        .from("tenants")
        .select("id")
        .eq("owner_user_id", userId)
        .is("deleted_at", null)
        .maybeSingle();
    if (tenantErr || !tenant) {
        return jsonResponse({ error: "No active tenant" }, 404, corsHeaders);
    }

    const { data: subRow } = await admin
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("tenant_id", tenant.id)
        .maybeSingle();

    if (!subRow?.stripe_customer_id) {
        // No customer yet — caller hasn't started Checkout. Nothing to sync.
        return jsonResponse({ status: null }, 200, corsHeaders);
    }

    let stripeSub: StripeSubscription | null;
    try {
        stripeSub = await fetchLatestSubscription(subRow.stripe_customer_id);
    } catch (err) {
        console.error("stripe API call failed:", (err as Error).message);
        return jsonResponse({ error: "Failed to fetch subscription" }, 502, corsHeaders);
    }

    if (!stripeSub) {
        // Customer exists but no subscription yet — Checkout in flight or abandoned.
        return jsonResponse({ status: "incomplete" }, 200, corsHeaders);
    }

    const priceId = stripeSub.items?.data?.[0]?.price?.id ?? null;

    const { error: upsertErr } = await admin
        .from("subscriptions")
        .upsert(
            {
                tenant_id: tenant.id,
                stripe_customer_id: stripeSub.customer,
                stripe_subscription_id: stripeSub.id,
                status: stripeSub.status,
                price_id: priceId,
                current_period_end: stripeSub.current_period_end
                    ? new Date(stripeSub.current_period_end * 1000).toISOString()
                    : null,
                cancel_at: stripeSub.cancel_at
                    ? new Date(stripeSub.cancel_at * 1000).toISOString()
                    : null,
                trial_end: stripeSub.trial_end
                    ? new Date(stripeSub.trial_end * 1000).toISOString()
                    : null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "tenant_id" },
        );
    if (upsertErr) {
        console.error("subscriptions upsert failed:", upsertErr.message);
        return jsonResponse({ error: "Failed to persist subscription" }, 500, corsHeaders);
    }

    // Mirror cancel/restore on tenants.deleted_at — same logic as webhook.
    if (stripeSub.status === "canceled") {
        await admin
            .from("tenants")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", tenant.id)
            .is("deleted_at", null);
    } else {
        await admin
            .from("tenants")
            .update({ deleted_at: null })
            .eq("id", tenant.id);
    }

    return jsonResponse({
        status: stripeSub.status,
        trial_end: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000).toISOString() : null,
        current_period_end: stripeSub.current_period_end
            ? new Date(stripeSub.current_period_end * 1000).toISOString() : null,
    }, 200, corsHeaders);
});
