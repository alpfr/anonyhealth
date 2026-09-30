// Triage Agent — clinical assessment from intake transcript.
//
// The Triage Agent receives the full Intake conversation history and produces
// a structured assessment: severity score, urgency level, recommended next
// steps, and a short summary suitable for provider handoff.
//
// Unlike Intake (which is conversational and uses Haiku), Triage is a single-
// shot assessment that benefits from more careful reasoning. We still stream
// the response so the UI can show it incrementally.
//
// Output format MUST end with:
//   <metadata>{"severity": N, "symptom": "...", "urgency": "...", "next_steps": "..."}</metadata>
//
// The frontend parses this metadata to populate the health log and surface
// the urgency to the user.
//
// Requires `verify_jwt = true` in supabase/config.toml.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
    getCorsHeaders,
    getUserIdFromJwt,
    jsonResponse,
    originAllowed,
} from "../_shared/cors.ts";
import {
    streamAnthropic,
    validateHistory,
} from "../_shared/anthropic.ts";
import { evaluateEmergencyReflex, auditTriageOutput } from "../_shared/jev_clinical_engine.ts";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3; // Lower than intake — triage is heavyweight

const TRIAGE_SYSTEM_PROMPT = `You are the Triage Agent for AnonyHealth, a privacy-first healthcare platform. The Intake Agent has just finished gathering symptom information from a patient. Your job is to assess that information and produce a clinical triage summary.

You are NOT a doctor and your output is NOT a diagnosis. You are providing a triage-level assessment to help the patient understand their situation and decide on next steps.

YOUR RESPONSE MUST HAVE TWO PARTS:

Part 1 — Plain-language assessment (3-5 short paragraphs):
- Acknowledge what the patient has shared
- Describe what category their symptoms suggest (without diagnosing)
- Identify any red flags or concerning features
- Recommend concrete next steps proportional to urgency
- Note when to seek immediate care vs. when self-care is reasonable

Part 2 — Structured metadata (MANDATORY, on its own line at the very end):
<metadata>{"severity": N, "symptom": "...", "urgency": "...", "next_steps": "..."}</metadata>

Where:
- severity: integer 1-10
    1-3 = minor, self-care reasonable
    4-6 = should see provider in days
    7-8 = should see provider within 24h
    9-10 = emergency, immediate care
- symptom: 2-6 word summary of the primary complaint
- urgency: one of "self-care", "routine", "urgent", "emergency"
- next_steps: one short sentence with the recommended action

CRITICAL SAFETY RULES:
- For chest pain, difficulty breathing, stroke signs, severe bleeding, suicidal ideation, or any life-threatening symptoms: severity=10, urgency="emergency", and your assessment must clearly direct the patient to call emergency services NOW.
- Err on the side of higher urgency when uncertain.
- Never recommend specific medications or dosages.
- Never recommend specific providers, clinics, or hospitals by name.

Write with calm clarity. The patient is anxious — your tone should be measured and grounded.`;

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
    if (!originAllowed(req)) {
        return jsonResponse({ error: "Origin not allowed" }, 403, corsHeaders);
    }

    const userId = getUserIdFromJwt(req);
    if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    }
    if (isRateLimited(userId)) {
        return jsonResponse(
            { error: "Triage is rate-limited. Please wait a minute." },
            429,
            corsHeaders,
        );
    }

    let body: { history?: unknown };
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    const history = validateHistory(body.history, 50);
    if (history === null || history.length === 0) {
        return jsonResponse(
            { error: "history is required: full intake transcript needed for assessment" },
            400,
            corsHeaders,
        );
    }

    // Jev System 1 Check: scan transcript for any unhandled emergency red flags (<1ms)
    for (const item of history) {
        if (item.role === "user") {
            const emergency = evaluateEmergencyReflex(item.content);
            if (emergency) {
                return jsonResponse({
                    emergency: true,
                    trigger: emergency.triggerCode,
                    decision_class: emergency.decisionClass,
                    advice: emergency.advice,
                    metadata: {
                        severity: 10,
                        urgency: "emergency",
                        symptom: emergency.title,
                        next_steps: "Call 911 or proceed immediately to the nearest Emergency Department.",
                    },
                }, 200, corsHeaders);
            }
        }
    }

    // Triage doesn't take a "next message" — it processes the existing
    // transcript. We append a synthetic user turn that asks the model to
    // perform its assessment, so the conversation is well-formed for the API.
    const messages = [
        ...history,
        {
            role: "user" as const,
            content:
                "Based on everything I've shared above, please provide your triage assessment now. Remember to include the <metadata> tag at the end.",
        },
    ];

    return await streamAnthropic(
        {
            systemPrompt: TRIAGE_SYSTEM_PROMPT,
            messages,
            maxTokens: 2048, // Triage output is longer than intake replies
        },
        corsHeaders,
    );
});
