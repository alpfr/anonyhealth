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
                model: 'claude-3-haiku-20240307',
                max_tokens: 1024,
                system: "You are a helpful and empathetic medical triage assistant for AnonyHealth. You are NOT a doctor. Listen to the user symptoms. Return your response in JSON format: { \"reply\": \"Your advice...\", \"severity\": 1-10 (int based on urgency), \"symptom\": \"Short summary of symptom\" }. Keep reply concise.",
                messages: [
                    { role: 'user', content: message }
                ],
            }),
        })

        const data = await response.json()

        if (data.error) {
            throw new Error(data.error.message)
        }

        const botContent = data.content[0].text
        let parsed;
        try {
            parsed = JSON.parse(botContent);
        } catch (e) {
            // Fallback if model refuses JSON
            parsed = { reply: botContent, severity: 0, symptom: "General" };
        }

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
