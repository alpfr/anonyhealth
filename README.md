# AnonyHealth

**Privacy-first Healthcare Triage Prototype**

AnonyHealth connects patients with healthcare providers while maintaining strict privacy standards. It features a confidential AI symptom checker, provider directory, health history tracking, and secure patient authentication with Maryland telehealth compliance.

## Features

- **Provider Directory** — Real-time provider list fetched from Supabase with fallback to local data. Filter by specialty, mode, language, and insurance.
- **AI Triage Chat** — Symptom analysis powered by Anthropic Claude (via Supabase Edge Functions). Returns structured JSON with severity scores (1-10) and symptom summaries.
- **Health History** — Logs previous triage sessions with severity color coding, AI advice, and timestamps. Per-user data protected by Row Level Security.
- **Confidential Registration** — Identity verification fields (name, DOB, address) for Maryland telehealth compliance. PII stored in Supabase auth metadata with consent timestamp.
- **Secure Authentication** — Supabase Auth with email/password sign up and sign in. Prototype access gated by password.
- **Responsive UI** — Split view (desktop + mobile phone frame), desktop-only, and mobile-only modes. Dark/light theme toggle.
- **Jev System 1 Clinical Safety Engine** — Deterministic edge reflex engine (<1ms, $0.00 token cost) intercepting emergency red flags (STEMI, stroke, anaphylaxis, crisis), dual-vault zero-knowledge PII/clinical data separation, and post-triage safety arbiter. See [docs/JEV_HEALTHCARE_ARCHITECTURE.md](docs/JEV_HEALTHCARE_ARCHITECTURE.md).
- **Privacy Controls** — Settings for anonymizing patient activity, notification preferences, and data management.

## Tech Stack

- **Frontend**: React 19, Vite 7, JavaScript (JSX)
- **Backend / DB**: Supabase (Postgres + PostgREST + Auth + Edge Functions)
- **Authentication**: Supabase Auth (email/password), RLS via `auth.uid()`
- **AI**: Anthropic Claude API (via Supabase Edge Function, streaming SSE)
- **Infrastructure**: Docker (multi-stage), Nginx, Kubernetes (GKE)
- **Fonts**: Outfit, Instrument Serif (Google Fonts)

## Getting Started

### Prerequisites

- Node.js v18+
- Supabase account
- Docker (for containerization)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Supabase project values:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   `src/supabaseClient.js` throws on startup if either variable is missing — there are no fallback values.

3. Apply the database schema in the Supabase SQL editor using `supabase_schema.sql`. This creates the `providers`, `health_logs`, `patient_profiles`, and `audit_logs` tables with RLS policies keyed to `auth.uid()`.

4. Deploy the AI chat edge function:
   ```bash
   supabase functions deploy aichat
   supabase secrets set ANTHROPIC_API_KEY=sk-...
   ```

5. Run the web frontend locally:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173`. Sign up with an email and password; Supabase Auth handles session management and issues the JWT used by PostgREST for RLS.

### Database Schema

| Table | Purpose | RLS |
|---|---|---|
| `providers` | Healthcare provider directory | Public read |
| `health_logs` | Per-user triage history (symptom, severity, AI advice) | User can read/insert own rows |

## App Screens

| Screen | Description |
|---|---|
| **Dashboard** | Activity input, triage results, appointments, settings link |
| **Find Provider** | Searchable provider cards with filters (desktop and mobile views) |
| **Provider Detail** | Bio, expertise chips, telehealth badge, verified intake button |
| **AI Chat** | Real-time chat with typing indicator, encrypted session badge, book appointment CTA |
| **History** | Chronological triage log with severity color coding (green/yellow/red) |
| **Register** | Sign up with identity verification or sign in toggle |
| **Settings** | Account, notifications, privacy toggles, about link, sign out |
| **About** | Feature cards, navigation guide, version info |

## Deployment

### Docker

```bash
docker build --platform linux/amd64 -t your-repo/anonyhealth:latest .
docker push your-repo/anonyhealth:latest
```

The Dockerfile uses a multi-stage build: Node.js for `npm run build`, then Nginx Alpine to serve the static files on port 8080.

### Kubernetes (GKE)

Ensure `deployment.yaml` is configured with the correct Docker image repository, desired replica count, and resource requests/limits before applying.

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

The deployment runs 2 replicas with resource limits (256Mi memory, 500m CPU). The service exposes port 80 via LoadBalancer targeting container port 8080.

## Project Structure

```
src/
  App.jsx           # All screens and components (monolithic)
  main.jsx          # React entry point
  supabaseClient.js # Supabase client initialization
  index.css         # Global styles
  App.css           # Component styles (mostly overridden by inline)
supabase/
  functions/
    aichat/
      index.ts      # Edge function for AI triage (Anthropic API)
supabase_schema.sql # Database schema and seed data
Dockerfile          # Multi-stage Docker build
nginx.conf          # Nginx config with SPA fallback
deployment.yaml     # Kubernetes deployment spec
service.yaml        # Kubernetes LoadBalancer service
```

## License

Proprietary Prototype.
