// Stripe webhook receiver. Mirrors subscription state into the
// `subscriptions` table via the service role.
//
// IMPORTANT: verify_jwt MUST be false for this function (Stripe does not send
// a Supabase JWT). Authenticity is proven by the Stripe signature header,
// which is verified with STRIPE_WEBHOOK_SECRET.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.24.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("stripe-webhook missing required env vars");
}

const stripe = STRIPE_SECRET_KEY
    ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() })
    : null;

const admin = SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

async function upsertSubscription(sub: Stripe.Subscription): Promise<void> {
    if (!admin) throw new Error("admin client not initialized");

    const tenantId = sub.metadata?.tenant_id;
    if (!tenantId) {
        console.warn("subscription missing tenant_id metadata:", sub.id);
        return;
    }

    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const priceId = sub.items.data[0]?.price?.id ?? null;

    const { error } = await admin
        .from("subscriptions")
        .upsert(
            {
                tenant_id: tenantId,
                stripe_customer_id: customerId,
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

    // Flag the tenant for 30-day purge when the sub fully cancels.
    if (sub.status === "canceled") {
        await admin
            .from("tenants")
            .update({ deleted_at: new Date().toISOString() })
            .eq("id", tenantId)
            .is("deleted_at", null);
    } else {
        // Restore if re-activated within the grace period.
        await admin
            .from("tenants")
            .update({ deleted_at: null })
            .eq("id", tenantId);
    }
}

serve(async (req) => {
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
    if (!stripe || !admin || !STRIPE_WEBHOOK_SECRET) {
        return new Response("service unavailable", { status: 503 });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) return new Response("missing signature", { status: 400 });

    const rawBody = await req.text();
    let event: Stripe.Event;
    try {
        event = await stripe.webhooks.constructEventAsync(
            rawBody,
            signature,
            STRIPE_WEBHOOK_SECRET,
            undefined,
            Stripe.createSubtleCryptoProvider(),
        );
    } catch (err) {
        console.error("signature verification failed:", (err as Error).message);
        return new Response("invalid signature", { status: 400 });
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.subscription) {
                    const subId = typeof session.subscription === "string"
                        ? session.subscription
                        : session.subscription.id;
                    const sub = await stripe.subscriptions.retrieve(subId);
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
                await upsertSubscription(event.data.object as Stripe.Subscription);
                break;
            }
            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                if (invoice.subscription) {
                    const subId = typeof invoice.subscription === "string"
                        ? invoice.subscription
                        : invoice.subscription.id;
                    const sub = await stripe.subscriptions.retrieve(subId);
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
