import express from 'express';
import fetch from 'node-fetch';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Initialize Firebase Admin with default credentials
// (Works automatically on Cloud Run via Workload Identity)
admin.initializeApp({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'alpfr-splunk-integration'
});

// PostgREST expects the JWT secret to be provided. When using Asymmetric JWTs
// like Firebase creates, PostgREST can accept a JWKS JSON object directly
// in the PGRST_JWT_SECRET environment variable instead of a generic string.
//
// Because Firebase rotates these keys periodically, we need a proxy that
// verifies the Firebase token via the official Firebase Admin SDK, and then
// "re-signs" or injects the appropriate claims before forwarding, OR we can
// just output the valid JWKS dynamically so PostgREST can read it.
//
// In this architecture, this Cloud Run service acts as a lightweight
// authentication middleware proxy sitting in front of PostgREST to translate
// Firebase ID tokens into PostgREST-compatible "Role" assertions.

app.get('/health', (req, res) => res.status(200).send('OK'));

app.use(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // 1. Verify the token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // 2. We extract the user's ID
    const userId = decodedToken.uid;
    const email = decodedToken.email;

    // 3. We construct a new JWT or just forward the request to PostgREST
    // Because PostgREST expects a 'role' claim, and Firebase JWTs don't have
    // 'role' by default, we use a neat trick: we can sign a short-lived
    // JWT here using that shared symmetric secret, OR we can pass headers.
    
    // For this example, we will forward the request to PostgREST and inject the
    // JWT that PostgREST *can* verify dynamically.
    
    // Since we are building an Auth Token translator, we will construct a new
    // token signed by the symmetric secret that PostgREST knows about.
    const INTERNAL_SECRET = process.env.PGRST_JWT_SECRET || 'your-super-secret-jwt-token-with-at-least-32-characters-long';
    
    const postgrestPayload = {
      role: 'authenticated', // Mapped to the Postgres role
      sub: userId,           // Mapped to current_setting('request.jwt.claim.sub')
      email: email,
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration
    };
    
    const postgrestToken = jwt.sign(postgrestPayload, INTERNAL_SECRET);

    // 4. Forward the request to the internal PostgREST service
    const POSTGREST_BASE_URL = process.env.POSTGREST_URL || 'http://postgrest.default.svc.cluster.local:3000';
    const targetUrl = `${POSTGREST_BASE_URL}${req.originalUrl}`;
    
    // Create new headers, omitting the original host and authorization
    const fetchHeaders = { ...req.headers };
    delete fetchHeaders.host;
    fetchHeaders.authorization = `Bearer ${postgrestToken}`;

    const proxyResponse = await fetch(targetUrl, {
      method: req.method,
      headers: fetchHeaders,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
    });

    // 5. Pipe the response back to the client
    const responseBody = await proxyResponse.text();
    
    res.status(proxyResponse.status);
    for (const [key, value] of proxyResponse.headers.entries()) {
      res.setHeader(key, value);
    }
    res.send(responseBody);

  } catch (error) {
    console.error('Auth verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid Firebase token' });
  }
});

app.listen(port, () => {
  console.log(`Auth proxy listening on port ${port}`);
});
