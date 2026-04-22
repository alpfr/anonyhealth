// Export all tenant data as JSON for the authenticated doctor.
// Used both during active use (self-service export) and during the 30-day
// post-cancellation grace window before hard-delete.

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

    const { data: tenant, error: tenantErr } = await admin
        .from("tenants")
        .select("id, name, created_at, deleted_at")
        .eq("owner_user_id", userId)
        .maybeSingle();
    if (tenantErr || !tenant) {
        return jsonResponse({ error: "No tenant found" }, 404, corsHeaders);
    }

    const [profilesRes, logsRes, auditRes, membersRes, subRes] = await Promise.all([
        admin.from("patient_profiles").select("*").eq("tenant_id", tenant.id),
        admin.from("health_logs").select("*").eq("tenant_id", tenant.id),
        admin.from("audit_logs").select("*").eq("tenant_id", tenant.id),
        admin.from("user_tenants").select("*").eq("tenant_id", tenant.id),
        admin.from("subscriptions")
            .select("status, price_id, current_period_end, cancel_at, trial_end, updated_at")
            .eq("tenant_id", tenant.id)
            .maybeSingle(),
    ]);

    const firstErr = profilesRes.error ?? logsRes.error ?? auditRes.error ?? membersRes.error ?? subRes.error;
    if (firstErr) {
        console.error("export failed:", firstErr.message);
        return jsonResponse({ error: "Export failed" }, 500, corsHeaders);
    }

    const bundle = {
        exported_at: new Date().toISOString(),
        schema_version: 1,
        tenant,
        subscription: subRes.data ?? null,
        memberships: membersRes.data ?? [],
        patient_profiles: profilesRes.data ?? [],
        health_logs: logsRes.data ?? [],
        audit_logs: auditRes.data ?? [],
    };

    // Record the export itself as an audit event (outside the scope of the
    // `authenticated` role's RLS — service role bypasses it).
    await admin.from("audit_logs").insert({
        tenant_id: tenant.id,
        user_id: userId,
        event_type: "tenant.export",
        detail: `Exported ${bundle.patient_profiles.length} profiles, ${bundle.health_logs.length} logs`,
    }).then(({ error }) => {
        if (error) console.warn("export audit insert failed:", error.message);
    });

    return new Response(JSON.stringify(bundle, null, 2), {
        status: 200,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="${tenant.id}-export.json"`,
        },
    });
});
