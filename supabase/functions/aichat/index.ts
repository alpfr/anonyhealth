import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { message } = await req.json()
        const apiKey = Deno.env.get('ANTHROPIC_API_KEY')

        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY is not set')
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20240620',
                max_tokens: 1024,
                system: "You are a helpful and empathetic medical triage assistant for AnonyHealth. You are NOT a doctor. Listen to the user symptoms, ask clarifying questions if needed, and provide general advice. Always suggest seeing a provider if symptoms are concerning. Keep responses concise (under 3 sentences usually).",
                messages: [
                    { role: 'user', content: message }
                ],
            }),
        })

        const data = await response.json()

        if (data.error) {
            throw new Error(data.error.message)
        }

        const botReply = data.content[0].text

        return new Response(JSON.stringify({ reply: botReply }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
