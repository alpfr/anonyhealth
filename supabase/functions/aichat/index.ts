import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ALLOWED_ORIGINS = [
    'https://anonyhealth.opssightai.com',
    'http://localhost:5173',
    'http://localhost:8080',
]

const MAX_MESSAGE_LENGTH = 2000

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('origin') || ''
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }
}

// Simple in-memory rate limiting (per Edge Function instance)
const rateLimitMap = new Map<string, { count: number, resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    
    if (!record) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }
    
    if (now > record.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }
    
    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
        return true;
    }
    
    record.count++;
    return false;
}

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req)

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    try {
        const { message } = await req.json()

        // 1. IP Rate Limiting Check
        const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
        if (isRateLimited(clientIp)) {
            return new Response(JSON.stringify({ error: 'Too many requests. Please wait a minute before sending another message.' }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. Input validation
        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'Message is required and must be a string' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        if (message.length > MAX_MESSAGE_LENGTH) {
            return new Response(JSON.stringify({ error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const sanitizedMessage = message.trim()

        const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

        if (!apiKey) {
            // Don't expose internal config details in error
            console.error('ANTHROPIC_API_KEY is not set')
            throw new Error('AI service is temporarily unavailable')
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1024,
                stream: true,
                system: `You are a helpful and empathetic medical triage assistant for AnonyHealth. You are NOT a doctor. Listen to the user symptoms.
IMPORTANT: You must structure your response in two parts. 
Part 1: Your concise advice to the user.
Part 2: You MUST end your response with an XML tag <metadata> containing JSON with {"severity": 1-10, "symptom": "short summary"}.
Example:
You should rest and drink water.
<metadata>{"severity": 2, "symptom": "Sore throat"}</metadata>`,
                messages: [
                    { role: 'user', content: sanitizedMessage }
                ],
            }),
        })

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Anthropic error: ${err}`);
        }

        return new Response(response.body, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })
    } catch (error) {
        // Don't leak internal error details to client
        const clientMessage = error.message;

        return new Response(JSON.stringify({ error: clientMessage }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
