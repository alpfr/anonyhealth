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
- **Privacy Controls** — Settings for anonymizing patient activity, notification preferences, and data management.

## Tech Stack

- **Frontend**: React 19, Vite 7, JavaScript (JSX)
- **Backend / DB**: PostgREST (PostgreSQL), Supabase Edge Functions
- **Authentication**: Firebase Auth (Identity Platform) + Custom Node.js Cloud Run Auth Proxy
- **AI**: Anthropic Claude API (claude-3-haiku via Edge Function)
- **Infrastructure**: Docker (multi-stage), Nginx, Kubernetes (GKE), Google Cloud Run
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

2. The application uses **Firebase Auth** for identity management. The frontend requests a Google Identity JWT which is intercepted by our custom backend proxy.
   Create a `.env` file in the project root:
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   ```
   *(Note: The `src/supabaseClient.js` hardcodes the current staging environment configs).*

3. Set up the Database schema — run `gcp-db-init.sql` for your PostgreSQL instance. This creates:
   - `roles` for PostgREST (`authenticator`, `anon`, `authenticated`)
   - `providers` table with mock provider data and public read RLS
   - `health_logs` table with per-user RLS for triage history

4. Deploy the AI chat edge function:
   ```bash
   supabase functions deploy aichat --no-verify-jwt
   supabase secrets set ANTHROPIC_API_KEY=sk-...
   ```

5. Run the web frontend locally:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173`. We have implemented an **Auto-Registration** flow: you can enter *any* email and password on the login screen, and the system will silently register you in Firebase and drop you into the Patient Dashboard!
   
6. **Auth Proxy Deployment:** A Node.js middleware sits between Firebase Auth and PostgREST. It verifies Firebase tokens and mints internal JWTs with the required PostgreSQL `role` claims.
   ```bash
   ./deploy_auth_proxy.sh
   ```

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
