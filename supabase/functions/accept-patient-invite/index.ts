// Redeem a patient invite. Called by the patient after they've signed up /
// signed in with Supabase Auth. Creates a user_tenants(role=patient) row and
// marks the invite used — all atomically via a single conditional update.
//
// Invite token lookup + consume is done in a single UPDATE that matches only
// unused, non-expired rows. If two concurrent requests race, Postgres gives
// exactly one of them the row.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { getCorsHeaders, getUserIdFromJwt, jsonResponse, originAllowed } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const admin = SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    if (!originAllowed(req)) return jsonResponse({ error: "Origin not allowed" }, 403, corsHeaders);
    if (!admin) return jsonResponse({ error: "Service unavailable" }, 503, corsHeaders);

    const userId = getUserIdFromJwt(req);
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

    let body: { token?: unknown };
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }
    const token = typeof body.token === "string" ? body.token : null;
    if (!token || token.length < 32 || token.length > 128) {
        return jsonResponse({ error: "Invalid token" }, 400, corsHeaders);
    }

    const nowIso = new Date().toISOString();
    const { data: claimed, error: claimErr } = await admin
        .from("patient_invites")
        .update({ used_at: nowIso, used_by: userId })
        .eq("token", token)
        .is("used_at", null)
        .gt("expires_at", nowIso)
        .select("tenant_id")
        .maybeSingle();

    if (claimErr) {
        console.error("invite claim failed:", claimErr.message);
        return jsonResponse({ error: "Failed to redeem invite" }, 500, corsHeaders);
    }
    if (!claimed) {
        return jsonResponse({ error: "Invite is invalid, expired, or already used" }, 410, corsHeaders);
    }

    const { error: membershipErr } = await admin
        .from("user_tenants")
        .upsert(
            { user_id: userId, tenant_id: claimed.tenant_id, role: "patient" },
            { onConflict: "user_id,tenant_id" },
        );
    if (membershipErr) {
        console.error("user_tenants upsert failed:", membershipErr.message);
        return jsonResponse({ error: "Failed to join tenant" }, 500, corsHeaders);
    }

    return jsonResponse({ tenant_id: claimed.tenant_id }, 200, corsHeaders);
});
