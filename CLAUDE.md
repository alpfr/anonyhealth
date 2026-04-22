# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # Production build → dist/
npm run lint         # ESLint (flat config, ESLint 9)
npm run preview      # Preview production build locally
```

### Docker Build (requires build args for Vite env vars)
```bash
docker build --platform linux/amd64 \
  --build-arg VITE_SUPABASE_URL=<url> \
  --build-arg VITE_SUPABASE_ANON_KEY=<key> \
  -t anonyhealth:latest .
```

### Kubernetes Deploy
```bash
kubectl apply -f deployment.yaml   # 2-replica deployment
kubectl apply -f service.yaml      # ClusterIP + Ingress + ManagedCertificate
```

No test suite is configured yet (Playwright is a devDep but no test files exist).

## Architecture

**Monolithic React SPA** — A single `src/App.jsx` acts as the router and auth gate. Navigation is state-machine driven (`currentScreen` + `onNavigate` callback), not a routing library.

### Data Flow
```
Browser → Supabase Auth + PostgREST (hosted) → Postgres (RLS)
Browser → Supabase Edge Function (aichat) → Anthropic Claude API (streaming SSE)
```

- **Authentication**: Supabase Auth (email+password). The client uses the session's `access_token` which PostgREST verifies natively; RLS policies use `auth.uid()`.
- **AI Chat**: `supabase/functions/aichat/index.ts` calls Claude via streaming SSE. The client (`AIChatMobile.jsx`) reads `content_block_delta` events and extracts `<metadata>` XML with severity scores.
- **Database Security**: All tables use PostgreSQL Row Level Security. Users can only access their own `health_logs` and `patient_profiles`.

### Key Directories
- `src/screens/` — Each app screen as a standalone component (mobile-first)
- `src/components/` — Shared UI (PhoneFrame, BottomNav, ProviderCard, etc.)
- `src/constants/theme.jsx` — Light/dark color palettes, icon SVGs, all style tokens
- `src/utils/audit.js` — SOC 2 compliance event logging (see phase-4 plan to move server-side)
- `src/supabaseClient.js` — Supabase client init; fails fast on missing env vars
- `supabase/functions/aichat/` — Edge function for Claude AI triage (TypeScript)

### Styling Pattern
All components use **inline `style={}` objects** referencing theme tokens from `src/constants/theme.jsx`. There is no CSS-in-JS library, CSS modules, or Tailwind. The theme object is typically received as `t` prop (e.g., `t.bg`, `t.text`, `t.accent`).

## Database Schema (supabase_schema.sql)
- `providers` — Healthcare provider directory (public read)
- `health_logs` — Per-user triage history with severity, symptom, AI advice (RLS)
- `patient_profiles` — PII: name, DOB, address, consent timestamp (RLS, isolated from health data)
- `audit_logs` — SOC 2 audit trail for all user events (RLS)

## Environment Variables
The app uses Vite env vars (prefixed `VITE_`):
- `VITE_SUPABASE_URL` — Supabase project URL (e.g. `https://xxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

Both are required. `src/supabaseClient.js` throws on startup if either is missing.

## Deployment
- **Docker**: Multi-stage build (Node 22 → Nginx 1.27 Alpine, non-root UID 101, port 8080)
- **GKE**: 2 replicas, security context (runAsNonRoot, drop ALL caps), readiness/liveness probes
- **Security Headers**: CSP, HSTS, X-Frame-Options: DENY in `nginx.conf`
- **CI/CD**: `cloudbuild.yaml` for Google Cloud Build → Artifact Registry → GKE deploy

## Repo
- GitHub: https://github.com/alpfr/anonymedsystem
- Remote `origin` points to this repo
