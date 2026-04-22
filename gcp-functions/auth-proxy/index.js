import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';

const port = process.env.PORT || 8080;

const INTERNAL_SECRET = process.env.PGRST_JWT_SECRET;
if (!INTERNAL_SECRET || INTERNAL_SECRET.length < 32) {
  throw new Error('PGRST_JWT_SECRET is required and must be at least 32 characters');
}

const POSTGREST_BASE_URL = process.env.POSTGREST_URL;
if (!POSTGREST_BASE_URL) {
  throw new Error('POSTGREST_URL is required');
}

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
if (!PROJECT_ID) {
  throw new Error('GOOGLE_CLOUD_PROJECT is required');
}

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

admin.initializeApp({ projectId: PROJECT_ID });

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error('Origin not allowed'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Prefer', 'Accept', 'Accept-Profile', 'Content-Profile', 'Range'],
    maxAge: 600,
  })
);
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => res.status(200).send('OK'));

const FORWARD_HEADER_ALLOWLIST = new Set([
  'content-type',
  'accept',
  'accept-profile',
  'content-profile',
  'prefer',
  'range',
]);

app.use(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.slice('Bearer '.length);

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    console.error('Auth verification failed:', error.code || error.message);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const postgrestToken = jwt.sign(
    {
      role: 'authenticated',
      sub: decodedToken.uid,
      email: decodedToken.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    INTERNAL_SECRET
  );

  const fetchHeaders = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (FORWARD_HEADER_ALLOWLIST.has(key.toLowerCase())) {
      fetchHeaders[key] = value;
    }
  }
  fetchHeaders.authorization = `Bearer ${postgrestToken}`;

  try {
    const proxyResponse = await fetch(`${POSTGREST_BASE_URL}${req.originalUrl}`, {
      method: req.method,
      headers: fetchHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    res.status(proxyResponse.status);
    for (const [key, value] of proxyResponse.headers.entries()) {
      if (key.toLowerCase() === 'transfer-encoding') continue;
      res.setHeader(key, value);
    }
    res.send(await proxyResponse.text());
  } catch (error) {
    console.error('Upstream request failed:', error.message);
    res.status(502).json({ error: 'Bad gateway' });
  }
});

app.listen(port, () => {
  console.log(`Auth proxy listening on port ${port}`);
});
