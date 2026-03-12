import express from 'express';
import cors from 'cors';
import { Anthropic } from '@anthropic-ai/sdk';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 8080;

app.use(cors({
  origin: ['https://anonyhealth.opssightai.com', 'http://localhost:5173', 'http://localhost:8080']
}));
app.use(express.json());

const MAX_MESSAGE_LENGTH = 2000;

// Simple in-memory rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip) {
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

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/aichat', async (req, res) => {
  try {
    const { message } = req.body;

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute before sending another message.' });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` });
    }

    const sanitizedMessage = message.trim();

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set');
      return res.status(503).json({ error: 'AI service is temporarily unavailable' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const stream = await anthropic.messages.stream({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: `You are a helpful and empathetic medical triage assistant for AnonyHealth. You are NOT a doctor. Listen to the user symptoms.
IMPORTANT: You must structure your response in two parts. 
Part 1: Your concise advice to the user.
Part 2: You MUST end your response with an XML tag <metadata> containing JSON with {"severity": 1-10, "symptom": "short summary"}.
Example:
You should rest and drink water.
<metadata>{"severity": 2, "symptom": "Sore throat"}</metadata>`,
        messages: [{ role: 'user', content: sanitizedMessage }],
    });

    stream.on('text', (text) => {
        // Map Anthropic's specific SDK events back to standard SSE format that our frontend expects
        // The Deno version was just proxying the raw HTTP stream from Anthropic.
        // We need to format it as Server-Sent Events.
        const eventData = JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text } });
        res.write(`data: ${eventData}\n\n`);
    });

    stream.on('end', () => {
        const endEvent = JSON.stringify({ type: "message_stop" });
        res.write(`data: ${endEvent}\n\n`);
        res.end();
    });

    stream.on('error', (error) => {
        console.error("Stream error:", error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    });

  } catch (error) {
    console.error("Handler error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message });
    }
    res.end();
  }
});

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`aichat function listening on port ${port}`);
});
