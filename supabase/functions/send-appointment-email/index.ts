// Sends appointment-related emails (request, confirm, counter, decline,
// cancel) to the patient and the provider. Uses Resend if RESEND_API_KEY is
// set; otherwise logs to console so dev environments don't fail.
//
// The client passes only the appointment_request id and the kind of
// notification. The function reads the row and the related profiles using
// the service role, so the patient cannot exfiltrate other users' emails.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { getCorsHeaders, getUserIdFromJwt, jsonResponse, originAllowed } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("APPOINTMENT_FROM_EMAIL") ?? "appointments@anonyhealth.app";

const admin = SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

type Kind = "request" | "confirm" | "counter" | "decline" | "cancel";

const fmtDate = (d: string) => new Date(d).toLocaleDateString(undefined,
    { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString(undefined,
    { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function buildEmails(kind: Kind, ctx: {
    practice: string; patientName: string; patientEmail: string | null;
    providerEmail: string | null; preferredDate: string; preferredWindow: string;
    reason: string; urgency: string; proposedAt: string | null; providerNote: string | null;
}): Array<{ to: string; subject: string; text: string }> {
    const out: Array<{ to: string; subject: string; text: string }> = [];
    const proposed = ctx.proposedAt ? fmtDateTime(ctx.proposedAt) : null;

    if (kind === "request") {
        if (ctx.providerEmail) {
            out.push({
                to: ctx.providerEmail,
                subject: `New appointment request — ${ctx.patientName}`,
                text: [
                    `New appointment request from ${ctx.patientName}.`,
                    ``,
                    `Preferred date: ${fmtDate(ctx.preferredDate)} (${ctx.preferredWindow})`,
                    `Urgency: ${ctx.urgency}`,
                    `Reason: ${ctx.reason}`,
                    ``,
                    `Sign in to AnonyHealth to confirm or propose a different time.`,
                ].join("\n"),
            });
        }
        if (ctx.patientEmail) {
            out.push({
                to: ctx.patientEmail,
                subject: `Your appointment request was received`,
                text: [
                    `Hi ${ctx.patientName},`,
                    ``,
                    `${ctx.practice} has received your appointment request for ${fmtDate(ctx.preferredDate)} (${ctx.preferredWindow}).`,
                    `You'll get an email when your provider confirms or proposes a different time.`,
                ].join("\n"),
            });
        }
    } else if (kind === "confirm") {
        if (ctx.patientEmail && proposed) out.push({
            to: ctx.patientEmail,
            subject: `Appointment confirmed — ${proposed}`,
            text: [
                `Hi ${ctx.patientName},`,
                ``,
                `${ctx.practice} confirmed your appointment for ${proposed}.`,
                ctx.providerNote ? `\nNote from your provider: ${ctx.providerNote}` : "",
            ].join("\n"),
        });
        if (ctx.providerEmail && proposed) out.push({
            to: ctx.providerEmail,
            subject: `Confirmed appointment — ${ctx.patientName} at ${proposed}`,
            text: `You confirmed an appointment with ${ctx.patientName} for ${proposed}.`,
        });
    } else if (kind === "counter") {
        if (ctx.patientEmail && proposed) out.push({
            to: ctx.patientEmail,
            subject: `Provider proposed a different time`,
            text: [
                `Hi ${ctx.patientName},`,
                ``,
                `${ctx.practice} proposed a different time: ${proposed}.`,
                ctx.providerNote ? `\nNote: ${ctx.providerNote}` : "",
                `\nSign in to AnonyHealth to accept or request another time.`,
            ].join("\n"),
        });
    } else if (kind === "decline") {
        if (ctx.patientEmail) out.push({
            to: ctx.patientEmail,
            subject: `Appointment request — please contact provider`,
            text: [
                `Hi ${ctx.patientName},`,
                ``,
                `${ctx.practice} could not confirm the requested time.`,
                ctx.providerNote ? `Note: ${ctx.providerNote}` : "Please submit a new request with another date.",
            ].join("\n"),
        });
    } else if (kind === "cancel") {
        if (ctx.providerEmail) out.push({
            to: ctx.providerEmail,
            subject: `Appointment cancelled — ${ctx.patientName}`,
            text: `${ctx.patientName} cancelled their appointment request.`,
        });
        if (ctx.patientEmail) out.push({
            to: ctx.patientEmail,
            subject: `Your appointment request was cancelled`,
            text: `Your appointment request with ${ctx.practice} has been cancelled.`,
        });
    }
    return out;
}

async function sendOne(to: string, subject: string, text: string): Promise<void> {
    if (!RESEND_API_KEY) {
        console.log(`[email-stub] to=${to} subject="${subject}"`);
        return;
    }
    const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: FROM_EMAIL, to, subject, text }),
    });
    if (!resp.ok) {
        const body = await resp.text();
        console.error(`Resend failed ${resp.status}: ${body}`);
    }
}

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
    if (!originAllowed(req)) return jsonResponse({ error: "Origin not allowed" }, 403, corsHeaders);
    if (!admin) return jsonResponse({ error: "Service unavailable" }, 503, corsHeaders);

    const userId = getUserIdFromJwt(req);
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);

    let body: { request_id?: unknown; kind?: unknown };
    try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders); }
    const requestId = typeof body.request_id === "string" ? body.request_id : null;
    const kind = typeof body.kind === "string" ? body.kind as Kind : null;
    if (!requestId || !kind) return jsonResponse({ error: "Missing request_id or kind" }, 400, corsHeaders);
    if (!["request", "confirm", "counter", "decline", "cancel"].includes(kind)) {
        return jsonResponse({ error: "Invalid kind" }, 400, corsHeaders);
    }

    // Load the request, the patient profile (for name), the tenant + owner for
    // provider email. Authorization: caller must be the patient OR a doctor of
    // the tenant. We replicate that check here using the service role.
    const { data: reqRow, error: reqErr } = await admin
        .from("appointment_requests")
        .select("id, tenant_id, patient_user_id, preferred_date, preferred_window, reason, urgency, proposed_at, provider_note, status")
        .eq("id", requestId)
        .maybeSingle();
    if (reqErr || !reqRow) return jsonResponse({ error: "Request not found" }, 404, corsHeaders);

    const { data: membership } = await admin
        .from("user_tenants")
        .select("role")
        .eq("user_id", userId)
        .eq("tenant_id", reqRow.tenant_id)
        .maybeSingle();
    const isPatient = reqRow.patient_user_id === userId;
    const isDoctor = membership?.role === "doctor";
    if (!isPatient && !isDoctor) return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);

    const [{ data: tenant }, { data: profile }] = await Promise.all([
        admin.from("tenants").select("name, owner_user_id").eq("id", reqRow.tenant_id).maybeSingle(),
        admin.from("patient_profiles").select("full_name").eq("id", reqRow.patient_user_id).maybeSingle(),
    ]);
    if (!tenant) return jsonResponse({ error: "Tenant missing" }, 500, corsHeaders);

    const [{ data: providerUser }, { data: patientUser }] = await Promise.all([
        admin.auth.admin.getUserById(tenant.owner_user_id),
        admin.auth.admin.getUserById(reqRow.patient_user_id),
    ]);

    const emails = buildEmails(kind, {
        practice: tenant.name ?? "Your provider",
        patientName: profile?.full_name ?? "Patient",
        patientEmail: patientUser?.user?.email ?? null,
        providerEmail: providerUser?.user?.email ?? null,
        preferredDate: reqRow.preferred_date,
        preferredWindow: reqRow.preferred_window,
        reason: reqRow.reason,
        urgency: reqRow.urgency,
        proposedAt: reqRow.proposed_at,
        providerNote: reqRow.provider_note,
    });

    await Promise.all(emails.map((e) => sendOne(e.to, e.subject, e.text)));
    return jsonResponse({ sent: emails.length }, 200, corsHeaders);
});
