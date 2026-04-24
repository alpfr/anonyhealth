// Stripe webhook receiver. Mirrors subscription state into the
// `subscriptions` table via the service role.
//
// IMPORTANT: verify_jwt MUST be false for this function (Stripe does not send
// a Supabase JWT). Authenticity is proven by the Stripe signature header,
// which we verify with Web Crypto HMAC-SHA256 — no npm/SDK dependency, so we
// avoid the esm.sh-shimmed Stripe SDK's compatibility issues in Supabase
// Edge Runtime (Deno.core.runMicrotasks errors).
//
// For event enrichment (retrieving the full Subscription when an event like
// checkout.session.completed only carries a sub id), we call the Stripe REST
// API directly with fetch() — no SDK required.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Stripe tolerates up to 5 minutes of clock skew by default.
const SIGNATURE_TOLERANCE_SECONDS = 300;

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("stripe-webhook missing required env vars");
}

const admin = SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

// ───────────────────────────────────────────────────────────────
// Signature verification
//
// Stripe signs webhook payloads as:  t=<timestamp>,v1=<hmac_sha256(secret, "<timestamp>.<payload>")>
// Multiple v1 signatures may be present (during secret rotation); any match
// is acceptable.
// ───────────────────────────────────────────────────────────────
async function verifyStripeSignature(
    rawBody: string,
    header: string,
    secret: string,
): Promise<boolean> {
    const parts = header.split(",").map((p) => p.trim());
    const timestamp = parts.find((p) => p.startsWith("t="))?.slice(2);
    const signatures = parts
        .filter((p) => p.startsWith("v1="))
        .map((p) => p.slice(3));

    if (!timestamp || signatures.length === 0) return false;

    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - ts) > SIGNATURE_TOLERANCE_SECONDS) {
        console.warn("stripe signature timestamp outside tolerance:", nowSec - ts, "s");
        return false;
    }

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const signedPayload = `${timestamp}.${rawBody}`;
    const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(signedPayload));
    const expectedHex = [...new Uint8Array(sigBuf)]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

    // Constant-time comparison per-signature.
    return signatures.some((sig) => timingSafeEqual(sig, expectedHex));
}

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

// ───────────────────────────────────────────────────────────────
// Stripe API fetch helper (subscription retrieval)
// ───────────────────────────────────────────────────────────────
async function retrieveSubscription(subId: string): Promise<StripeSubscription> {
    const res = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
        headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` },
    });
    if (!res.ok) {
        throw new Error(`stripe API error ${res.status}: ${await res.text()}`);
    }
    return res.json();
}

// Narrow types for the fields we actually read. Stripe sends many more.
interface StripeSubscription {
    id: string;
    status: string;
    customer: string;
    items: { data: Array<{ price?: { id?: string } }> };
    current_period_end?: number;
    cancel_at?: number | null;
    trial_end?: number | null;
    metadata?: Record<string, string>;
}

async function upsertSubscription(sub: StripeSubscription): Promise<void> {
    if (!admin) throw new Error("admin client not initialized");

    const tenantId = sub.metadata?.tenant_id;
    if (!tenantId) {
        console.warn("subscription missing tenant_id metadata:", sub.id);
        return;
    }

    const priceId = sub.items?.data?.[0]?.price?.id ?? null;

    const { error } = await admin
        .from("subscriptions")
        .upsert(
            {
                tenant_id: tenantId,
                stripe_customer_id: sub.customer,
                stripe_subscription_id: sub.id,
                status: sub.status,
                price_id: priceId,
                current_period_end: sub.current_period_end
                    ? new Date(sub.current_period_end * 1000).toISOString()
                    : null,
                cancel_at: sub.cancel_at
                    ? new Date(sub.cancel_at * 1000).toISOString()
                    : null,
                trial_end: sub.trial_end
                    ? new Date(sub.trial_end * 1000).toISOString()
                    : null,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "tenant_id" },
        );

    if (error) {
        console.error("subscriptions upsert failed:", error.message);
        throw error;
    }

    if (sub.status === "canceled") {
        await admin
            .from("tenants")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", tenantId)
            .is("deleted_at", null);
    } else {
        await admin
            .from("tenants")
            .update({ deleted_at: null })
            .eq("id", tenantId);
    }
}

// ───────────────────────────────────────────────────────────────
// Handler
// ───────────────────────────────────────────────────────────────
serve(async (req) => {
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
    if (!admin || !STRIPE_WEBHOOK_SECRET || !STRIPE_SECRET_KEY) {
        return new Response("service unavailable", { status: 503 });
    }

    const signatureHeader = req.headers.get("stripe-signature");
    if (!signatureHeader) return new Response("missing signature", { status: 400 });

    const rawBody = await req.text();
    const ok = await verifyStripeSignature(rawBody, signatureHeader, STRIPE_WEBHOOK_SECRET);
    if (!ok) {
        console.error("signature verification failed");
        return new Response("invalid signature", { status: 400 });
    }

    let event: { type: string; data: { object: Record<string, unknown> } };
    try {
        event = JSON.parse(rawBody);
    } catch {
        return new Response("invalid payload", { status: 400 });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as { subscription?: string };
                if (session.subscription) {
                    const sub = await retrieveSubscription(session.subscription);
                    await upsertSubscription(sub);
                }
                break;
            }
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted":
            case "customer.subscription.trial_will_end":
            case "customer.subscription.paused":
            case "customer.subscription.resumed": {
                await upsertSubscription(event.data.object as unknown as StripeSubscription);
                break;
            }
            case "invoice.payment_failed": {
                const invoice = event.data.object as { subscription?: string };
                if (invoice.subscription) {
                    const sub = await retrieveSubscription(invoice.subscription);
                    await upsertSubscription(sub);
                }
                break;
            }
            default:
                // Acknowledge unknown events so Stripe does not retry forever.
                break;
        }
    } catch (err) {
        console.error("webhook handler error:", (err as Error).message);
        return new Response("handler error", { status: 500 });
    }

    return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
});
