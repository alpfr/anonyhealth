// Shared CORS helper. All client-facing functions allowlist origins via the
// ALLOWED_ORIGINS env var (comma-separated).
//
// Origin entries support glob-style wildcards:
//   "https://anonyhealth.opssightai.com"  → exact match
//   "https://*.opssightai.com"            → any single subdomain label
//   "http://localhost:*"                  → any port on localhost
//   "https://*.preview.opssightai.com"    → any preview deploy (one label)
//
// `*` matches one DNS label or port — it does NOT cross "." or "/" boundaries.
// So `https://*.opssightai.com` matches `staging.opssightai.com` but NOT
// `a.b.opssightai.com`. Use multiple wildcards for multi-level subdomains:
//   "https://*.*.opssightai.com"
//
// Fallback allowed origins if ALLOWED_ORIGINS env var is not explicitly set
const DEFAULT_ALLOWED_ORIGINS = [
    "https://anonyhealth.opssightai.com",
    "https://*.opssightai.com",
    "https://anonyhealth-cg4uqokewq-uc.a.run.app",
    "https://*.a.run.app",
    "https://anonyhealth.alpfr.com",
    "https://*.alpfr.com",
    "http://localhost:*",
    "http://127.0.0.1:*"
];

const envOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

const PATTERN_SOURCES = envOrigins.length > 0 ? envOrigins : DEFAULT_ALLOWED_ORIGINS;

function patternToRegExp(pattern: string): RegExp {
    // 1. Escape every regex metacharacter — including `*` itself — so the
    //    pattern is treated literally by default.
    // 2. Then unescape `\*` back into a wildcard sub-pattern that matches
    //    any non-empty sequence of characters that are NOT `/` or `.`.
    //    Excluding `.` enforces single-DNS-label semantics, matching the
    //    convention used by nginx, AWS ACM, and most edge CDNs:
    //    `https://*.opssightai.com` matches `staging.opssightai.com` but
    //    NOT `a.b.opssightai.com`.
    const escaped = pattern.replace(/[.+?^${}()|[\]\\*]/g, "\\$&");
    const withWildcards = escaped.replace(/\\\*/g, "[^./]+");
    return new RegExp(`^${withWildcards}$`);
}

const ALLOWED_ORIGIN_PATTERNS = PATTERN_SOURCES.map(patternToRegExp);

function isOriginAllowed(origin: string): boolean {
    if (!origin) return false;
    return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

export function getCorsHeaders(req: Request): Record<string, string> {
    const origin = req.headers.get("origin") ?? "";
    const headers: Record<string, string> = {
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type, stripe-signature",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
    };
    if (isOriginAllowed(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
    }
    return headers;
}

export function originAllowed(req: Request): boolean {
    const origin = req.headers.get("origin") ?? "";
    // Allow same-origin / server-to-server (no Origin header) and any origin
    // matching a configured pattern. An empty patterns list locks down to
    // server-to-server only.
    if (!origin) return true;
    if (ALLOWED_ORIGIN_PATTERNS.length === 0) return false;
    return isOriginAllowed(origin);
}

export function jsonResponse(
    body: unknown,
    status: number,
    headers: Record<string, string>,
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...headers, "Content-Type": "application/json" },
    });
}

export function getUserIdFromJwt(req: Request): string | null {
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

export function getUserEmailFromJwt(req: Request): string | null {
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
        return typeof payload.email === "string" ? payload.email : null;
    } catch {
        return null;
    }
}
