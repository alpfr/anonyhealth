// AI triage edge function.
// Requires `verify_jwt = true` in supabase/config.toml — the Supabase platform
// rejects unauthenticated requests before this function is invoked, so we can
// trust the JWT `sub` claim for the user identity.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

// ─── CORS allowlist with glob-style wildcard support ──────
//
// ALLOWED_ORIGINS is a comma-separated list. Entries support `*` wildcards
// that match one DNS label or one port — never crossing "." or "/" boundaries.
//
//   "https://anonyhealth.opssightai.com" → exact origin
//   "https://*.opssightai.com"           → any single subdomain
//   "http://localhost:*"                 → any port on localhost
//
// An empty list denies every browser origin (server-to-server only).
const PATTERN_SOURCES = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

function patternToRegExp(pattern: string): RegExp {
    // Escape every regex metacharacter (including `*`), then unescape `\*`
    // back into `[^./]+` so a single wildcard matches one DNS label or one
    // port — never crosses a `.` or `/` boundary.
    const escaped = pattern.replace(/[.+?^${}()|[\]\\*]/g, "\\$&");
    const withWildcards = escaped.replace(/\\\*/g, "[^./]+");
    return new RegExp(`^${withWildcards}$`);
}

const ALLOWED_ORIGIN_PATTERNS = PATTERN_SOURCES.map(patternToRegExp);

function isOriginAllowed(origin: string): boolean {
    if (!origin) return false;
    return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

function getCorsHeaders(req: Request): Record<string, string> {
    const origin = req.headers.get("origin") ?? "";
    const headers: Record<string, string> = {
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
    };
    if (isOriginAllowed(origin)) headers["Access-Control-Allow-Origin"] = origin;
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

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(key: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(key);
    if (!record || now > record.resetAt) {
        rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }
    if (record.count >= MAX_REQUESTS_PER_WINDOW) return true;
    record.count++;
    return false;
}

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    }

    // Reject browser requests from disallowed origins (server-to-server, where
    // the Origin header is absent, is permitted by design).
    const origin = req.headers.get("origin") ?? "";
    if (origin && !isOriginAllowed(origin)) {
        return jsonResponse({ error: "Origin not allowed" }, 403, corsHeaders);
    }

    const userId = getUserIdFromJwt(req);
    if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    }

    if (isRateLimited(userId)) {
        return jsonResponse(
            { error: "Too many requests. Please wait a minute before sending another message." },
            429,
            corsHeaders,
        );
    }

    let message: unknown;
    try {
        const body = await req.json();
        message = body?.message;
    } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    if (typeof message !== "string" || message.trim().length === 0) {
        return jsonResponse({ error: "Message is required and must be a non-empty string" }, 400, corsHeaders);
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
        return jsonResponse(
            { error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` },
            400,
            corsHeaders,
        );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
        console.error("ANTHROPIC_API_KEY is not set");
        return jsonResponse({ error: "AI service is temporarily unavailable" }, 503, corsHeaders);
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 1024,
            stream: true,
            system: `You are a helpful and empathetic medical triage assistant for AnonyHealth. You are NOT a doctor. Listen to the user symptoms.
IMPORTANT: You must structure your response in two parts.
Part 1: Your concise advice to the user.
Part 2: You MUST end your response with an XML tag <metadata> containing JSON with {"severity": 1-10, "symptom": "short summary"}.
Example:
You should rest and drink water.
<metadata>{"severity": 2, "symptom": "Sore throat"}</metadata>`,
            messages: [{ role: "user", content: message.trim() }],
        }),
    });

    if (!anthropicResponse.ok) {
        const detail = await anthropicResponse.text().catch(() => "");
        console.error("Anthropic upstream error:", anthropicResponse.status, detail);
        return jsonResponse({ error: "AI service request failed" }, 502, corsHeaders);
    }

    return new Response(anthropicResponse.body, {
        headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
});
