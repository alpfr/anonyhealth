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

        // Input validation
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
                system: "You are a helpful and empathetic medical triage assistant for AnonyHealth. You are NOT a doctor. Listen to the user symptoms. Return your response in JSON format: { \"reply\": \"Your advice...\", \"severity\": 1-10 (int based on urgency), \"symptom\": \"Short summary of symptom\" }. Keep reply concise.",
                messages: [
                    { role: 'user', content: sanitizedMessage }
                ],
            }),
        })

        const data = await response.json()

        if (data.error) {
            console.error('Anthropic API error:', data.error.message)
            throw new Error('AI service encountered an error')
        }

        const botContent = data.content[0].text
        let parsed;
        try {
            parsed = JSON.parse(botContent);
        } catch (e) {
            parsed = { reply: botContent, severity: 0, symptom: "General" };
        }

        // Validate severity is within expected range
        if (typeof parsed.severity === 'number') {
            parsed.severity = Math.max(0, Math.min(10, Math.round(parsed.severity)));
        } else {
            parsed.severity = 0;
        }

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        // Don't leak internal error details to client
        const clientMessage = error.message.includes('unavailable') || error.message.includes('encountered')
            ? error.message
            : 'An unexpected error occurred'

        return new Response(JSON.stringify({ error: clientMessage }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
