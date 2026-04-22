// Generate a tokenized patient invite for the authenticated doctor's tenant.
// Returns the raw token and a redemption URL; the doctor shares the URL with
// the patient out-of-band.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { encodeBase64Url } from "https://deno.land/std@0.224.0/encoding/base64url.ts";
import { getCorsHeaders, getUserIdFromJwt, jsonResponse, originAllowed } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "";
const INVITE_TTL_HOURS = Number(Deno.env.get("INVITE_TTL_HOURS") ?? "168"); // 7 days

const admin = SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

function generateToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return encodeBase64Url(bytes);
}

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    if (!originAllowed(req)) return jsonResponse({ error: "Origin not allowed" }, 403, corsHeaders);
    if (!admin) return jsonResponse({ error: "Service unavailable" }, 503, corsHeaders);

    const userId = getUserIdFromJwt(req);
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

    let body: { email?: unknown };
    try {
        body = await req.json();
    } catch {
        body = {};
    }
    const email = typeof body.email === "string" && body.email.length <= 320 ? body.email : null;

    // Doctor must own the tenant and have an active/trialing subscription.
    const { data: tenant } = await admin
        .from("tenants")
        .select("id")
        .eq("owner_user_id", userId)
        .is("deleted_at", null)
        .maybeSingle();
    if (!tenant) return jsonResponse({ error: "No active tenant" }, 404, corsHeaders);

    const { data: sub } = await admin
        .from("subscriptions")
        .select("status")
        .eq("tenant_id", tenant.id)
        .maybeSingle();
    if (!sub || !["active", "trialing"].includes(sub.status)) {
        return jsonResponse({ error: "Subscription not active" }, 402, corsHeaders);
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3600 * 1000).toISOString();

    const { error: insertErr } = await admin.from("patient_invites").insert({
        token,
        tenant_id: tenant.id,
        created_by: userId,
        email,
        expires_at: expiresAt,
    });
    if (insertErr) {
        console.error("invite insert failed:", insertErr.message);
        return jsonResponse({ error: "Failed to create invite" }, 500, corsHeaders);
    }

    return jsonResponse(
        {
            token,
            url: `${APP_URL}/invite/${token}`,
            expires_at: expiresAt,
        },
        200,
        corsHeaders,
    );
});
