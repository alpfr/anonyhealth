// Shared Anthropic API helper used by all LLM-backed agents.
//
// Each agent (intake, triage, future de-id, etc.) calls `streamAnthropic`
// with its own system prompt and message history. This keeps the Anthropic-
// specific request shape, error handling, and response forwarding in one
// place so adding a new agent is just writing a new system prompt.

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_MAX_TOKENS = 1024;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export type Role = "user" | "assistant";

export interface Message {
    role: Role;
    content: string;
}

export interface StreamAnthropicOptions {
    systemPrompt: string;
    messages: Message[];
    model?: string;
    maxTokens?: number;
}

/**
 * Stream a Claude response. Returns the raw upstream Response on success so
 * the caller can pipe `response.body` straight to the client as an SSE stream.
 *
 * On upstream error returns a JSON Response with a 502 status.
 */
export async function streamAnthropic(
    opts: StreamAnthropicOptions,
    corsHeaders: Record<string, string>,
): Promise<Response> {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
        console.error("ANTHROPIC_API_KEY is not set");
        return jsonError("AI service is temporarily unavailable", 503, corsHeaders);
    }

    const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        body: JSON.stringify({
            model: opts.model ?? ANTHROPIC_MODEL,
            max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
            stream: true,
            system: opts.systemPrompt,
            messages: opts.messages,
        }),
    });

    if (!anthropicResponse.ok) {
        const detail = await anthropicResponse.text().catch(() => "");
        console.error("Anthropic upstream error:", anthropicResponse.status, detail);
        return jsonError("AI service request failed", 502, corsHeaders);
    }

    return new Response(anthropicResponse.body, {
        headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}

function jsonError(message: string, status: number, headers: Record<string, string>) {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...headers, "Content-Type": "application/json" },
    });
}

/**
 * Validate and normalize a conversation history array sent from the client.
 * Returns null if the input is malformed.
 *
 * Why we re-validate rather than trusting the client:
 *   • Conversation history affects what the LLM sees — bad data = bad output
 *   • Each message goes into Anthropic's API; malformed data causes 400s
 *   • This is a security boundary even though Supabase auth has already
 *     authenticated the user
 */
export function validateHistory(input: unknown, maxMessages = 50): Message[] | null {
    if (!Array.isArray(input)) return null;
    if (input.length > maxMessages) return null;

    const out: Message[] = [];
    for (const item of input) {
        if (typeof item !== "object" || item === null) return null;
        const role = (item as Record<string, unknown>).role;
        const content = (item as Record<string, unknown>).content;
        if (role !== "user" && role !== "assistant") return null;
        if (typeof content !== "string") return null;
        if (content.length === 0 || content.length > 4000) return null;
        out.push({ role, content });
    }
    return out;
}
