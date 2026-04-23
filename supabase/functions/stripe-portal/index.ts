// Return a Stripe Billing Portal URL so a subscribed doctor can manage
// (upgrade/cancel/update card) their subscription.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.24.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { getCorsHeaders, getUserIdFromJwt, jsonResponse, originAllowed } from "../_shared/cors.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const stripe = STRIPE_SECRET_KEY
    ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() })
    : null;

const admin = SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    if (!originAllowed(req)) return jsonResponse({ error: "Origin not allowed" }, 403, corsHeaders);
    if (!stripe || !admin) return jsonResponse({ error: "Service unavailable" }, 503, corsHeaders);

    const userId = getUserIdFromJwt(req);
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

    const { data: tenant, error: tenantErr } = await admin
        .from("tenants")
        .select("id")
        .eq("owner_user_id", userId)
        .maybeSingle();
    if (tenantErr || !tenant) {
        return jsonResponse({ error: "No tenant found" }, 404, corsHeaders);
    }

    const { data: sub, error: subErr } = await admin
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
    if (subErr || !sub?.stripe_customer_id) {
        return jsonResponse({ error: "No subscription to manage" }, 404, corsHeaders);
    }

    const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: `${APP_URL}/settings`,
    });

    return jsonResponse({ url: portal.url }, 200, corsHeaders);
});
