// Server-side audit log writer.
// - Requires a valid Supabase JWT (verify_jwt = true in config.toml).
// - user_id is taken from the JWT `sub`, not from the request body — clients
//   cannot forge entries for other users.
// - event_type is validated against an allowlist; free-form detail is capped.
// - Writes via the service-role key, bypassing RLS so the `authenticated`
//   role can have INSERT revoked on audit_logs (append-only from server only).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const ALLOWED_EVENT_TYPES = new Set([
    "auth.sign_in",
    "auth.sign_up",
    "auth.sign_out",
    "profile.update",
    "health_log.create",
    "settings.change",
    "phi.read",
    "message.send",
    "message.read",
]);

const MAX_DETAIL_LENGTH = 512;

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

function getCorsHeaders(req: Request): Record<string, string> {
    const origin = req.headers.get("origin") ?? "";
    const headers: Record<string, string> = {
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
    };
    if (ALLOWED_ORIGINS.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
    return headers;
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...headers, "Content-Type": "application/json" },
    });
}

function getUserIdFromJwt(req: Request): string | null {
    const auth = req.headers.get("authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    try {
        const payload = JSON.parse(
            new TextDecoder().decode(
                Uint8Array.from(
                    atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
                    (c) => c.charCodeAt(0),
                ),
            ),
        );
        return typeof payload.sub === "string" ? payload.sub : null;
    } catch {
        return null;
    }
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !serviceRoleKey) {
    console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
}
const admin = supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : null;

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    }

    const origin = req.headers.get("origin") ?? "";
    if (ALLOWED_ORIGINS.length > 0 && origin && !ALLOWED_ORIGINS.includes(origin)) {
        return jsonResponse({ error: "Origin not allowed" }, 403, corsHeaders);
    }

    const userId = getUserIdFromJwt(req);
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

    if (!admin) return jsonResponse({ error: "Service unavailable" }, 503, corsHeaders);

    let body: { event_type?: unknown; detail?: unknown };
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    const { event_type, detail } = body;
    if (typeof event_type !== "string" || !ALLOWED_EVENT_TYPES.has(event_type)) {
        return jsonResponse({ error: "Invalid event_type" }, 400, corsHeaders);
    }
    let safeDetail: string | null = null;
    if (detail != null) {
        if (typeof detail !== "string") {
            return jsonResponse({ error: "detail must be a string" }, 400, corsHeaders);
        }
        safeDetail = detail.slice(0, MAX_DETAIL_LENGTH);
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 256) ?? null;

    // Resolve the caller's tenant. In v1 a user has at most one tenant; if the
    // model ever expands to multi-tenant users, the client should pass an
    // explicit tenant_id and we'd validate membership here.
    const { data: memberships } = await admin
        .from("user_tenants")
        .select("tenant_id")
        .eq("user_id", userId)
        .limit(1);
    const tenantId = memberships?.[0]?.tenant_id ?? null;

    const { error } = await admin.from("audit_logs").insert({
        tenant_id: tenantId,
        user_id: userId,
        event_type,
        detail: safeDetail,
        ip: clientIp,
        user_agent: userAgent,
    });

    if (error) {
        console.error("audit_logs insert failed:", error.message);
        return jsonResponse({ error: "Failed to record event" }, 500, corsHeaders);
    }

    return jsonResponse({ ok: true }, 200, corsHeaders);
});
