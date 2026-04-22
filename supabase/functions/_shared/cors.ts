// Shared CORS helper. All client-facing functions allowlist origins via the
// ALLOWED_ORIGINS env var (comma-separated). An empty list denies everything.

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

export function getCorsHeaders(req: Request): Record<string, string> {
    const origin = req.headers.get("origin") ?? "";
    const headers: Record<string, string> = {
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type, stripe-signature",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "600",
        "Vary": "Origin",
    };
    if (ALLOWED_ORIGINS.includes(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
    }
    return headers;
}

export function originAllowed(req: Request): boolean {
    const origin = req.headers.get("origin") ?? "";
    return ALLOWED_ORIGINS.length === 0 || !origin || ALLOWED_ORIGINS.includes(origin);
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
