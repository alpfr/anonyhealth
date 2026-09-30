// Intake Agent — conversational symptom gathering.
//
// The Intake Agent's job is to have a focused, empathetic conversation that
// gathers enough clinical detail for the Triage Agent to do its job. It
// asks one question at a time, never tries to diagnose, and signals when
// it has enough information by emitting "<complete/>" at the end of its
// final response.
//
// The frontend watches for that marker and, when it sees it, switches to
// calling the Triage Agent with the full transcript.
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
    type Message,
} from "../_shared/anthropic.ts";
import { evaluateEmergencyReflex } from "../_shared/jev_clinical_engine.ts";

const MAX_MESSAGE_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10; // Higher than triage — intake is conversational

// Maximum number of intake turns before we force completion. Prevents the
// agent from chatting forever and the user from running up costs.
const MAX_INTAKE_TURNS = 12;

const INTAKE_SYSTEM_PROMPT = `You are the Intake Agent for AnonyHealth, a privacy-first healthcare platform. Your role is to gather symptom information through empathetic, focused conversation. You are NOT a doctor and you do NOT diagnose, suggest treatments, or assess severity — that's the Triage Agent's job, which runs after you.

YOUR JOB:
- Ask ONE focused question per turn to gather clinical detail
- Listen carefully and acknowledge what the user shares
- Cover key dimensions: onset, duration, location, severity descriptor (the user's own words, not your assessment), associated symptoms, what makes it better/worse, prior history
- Use plain language; never medical jargon unless the user uses it first
- Be warm but efficient — most intakes need 3-5 questions, max 8

WHEN YOU HAVE ENOUGH INFORMATION:
- Briefly summarize what you've gathered (1-2 sentences)
- End your message with the literal tag "<complete/>" on its own line
- Do NOT include the tag in earlier messages

CRITICAL RULES:
- NEVER diagnose conditions
- NEVER suggest medications, dosages, or treatments
- NEVER assess severity numerically (no "this is mild" or "this is urgent")
- NEVER mention specific doctors, clinics, or hospitals
- If the user describes emergency symptoms (chest pain, difficulty breathing, suicidal ideation, severe bleeding, stroke signs), END IMMEDIATELY with: "These symptoms need urgent medical attention. Please call emergency services or go to your nearest emergency room. <complete/>"

Keep replies SHORT — 1-3 sentences max per turn. You're a triage intake nurse, not a chatbot. Speak naturally.`;

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
            { error: "Too many requests. Please wait a minute and try again." },
            429,
            corsHeaders,
        );
    }

    let body: { message?: unknown; history?: unknown };
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    const message = body.message;
    if (typeof message !== "string" || message.trim().length === 0) {
        return jsonResponse(
            { error: "Message is required and must be a non-empty string" },
            400,
            corsHeaders,
        );
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
        return jsonResponse(
            { error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` },
            400,
            corsHeaders,
        );
    }

    // Jev System 1 Edge Reflex Intercept (<1ms)
    const emergency = evaluateEmergencyReflex(message);
    if (emergency) {
        return jsonResponse(
            {
                emergency: true,
                trigger: emergency.triggerCode,
                decision_class: emergency.decisionClass,
                advice: emergency.advice,
            },
            200,
            corsHeaders,
        );
    }

    // History is optional on the first turn.
    const history = body.history === undefined
        ? []
        : validateHistory(body.history, MAX_INTAKE_TURNS * 2);
    if (history === null) {
        return jsonResponse({ error: "Invalid history format" }, 400, corsHeaders);
    }

    // If the user has reached the cap, signal completion via system prompt
    // adjustment. The model still produces a normal response, but the prompt
    // strongly encourages it to wrap up with <complete/>.
    const userTurnCount = history.filter((m) => m.role === "user").length + 1;
    const wrapUpHint = userTurnCount >= MAX_INTAKE_TURNS
        ? "\n\nIMPORTANT: This is the final intake turn. Summarize what you've gathered and end with <complete/>."
        : "";

    const messages: Message[] = [
        ...history,
        { role: "user", content: message.trim() },
    ];

    return await streamAnthropic(
        {
            systemPrompt: INTAKE_SYSTEM_PROMPT + wrapUpHint,
            messages,
        },
        corsHeaders,
    );
});
