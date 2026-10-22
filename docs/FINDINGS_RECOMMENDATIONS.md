# AnonyHealth: Technical Findings & Recommendations

This document summarizes the technical findings from the current Cloud Run + Supabase Auth deployment and outlines key recommendations for transitioning AnonyHealth from a tested prototype to a production-ready platform.

---

## 1. Technical Findings: Current Architecture

AnonyHealth v1.0 is deployed on **Google Cloud Run** with **Supabase** as the backend-as-a-service. The current architecture successfully resolves the original auth proxy complexity by using Supabase Auth natively.

### Architecture Overview

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | React 19 + Vite 7 | Served as static files via Nginx on Cloud Run |
| **Auth** | Supabase Auth (email/password + anonymous sessions) | JWT issued directly by Supabase — no proxy required |
| **Database** | Supabase PostgreSQL + Row Level Security | `auth.uid()` isolation per tenant/patient |
| **AI Triage** | Anthropic Claude via Supabase Edge Functions | Streaming SSE responses |
| **Payments** | Stripe (via Supabase Edge Functions) | Subscription billing with Stripe Customer Portal |
| **Infrastructure** | Google Cloud Run (scale-to-zero, ~98% cost vs GKE) | Container built via Cloud Build (`cloudbuild.yaml`) |
| **Domain** | `anonyhealth.alpfr.com` (custom domain via Cloud Run) | TLS managed by Google |

### Resolved Issues (vs. Prior GKE/Auth Proxy Architecture)

1. **Auth Proxy Eliminated:** The original architecture required a Node.js Express proxy to bridge Firebase Auth JWTs with PostgREST `role` claims. Supabase Auth natively issues JWTs with the correct claims — the proxy is no longer needed.

2. **Anonymous Session Race Condition (Fixed):** `callFunction()` in `src/utils/functions.js` was failing with "Failed to fetch" during anonymous session bootstrap. Fixed by adding a `refreshSession()` fallback — if `getSession()` returns null, a single refresh recovers the session without surfacing errors to the user.

3. **Provider Booking URL Validation (Fixed):** Providers were able to save root-level Calendly URLs (e.g. `calendly.com/name`) causing patients to land on the wrong booking page. Fixed with live inline validation in `ProviderProfileMobile.jsx` that blocks saving until a valid event-specific URL is entered.

4. **Settings Persistence (Fixed):** Notification and privacy toggles in `SettingsMobile.jsx` were resetting on navigation. Fixed by using `localStorage` for state initialization.

5. **GKE → Cloud Run Migration:** Eliminated Kubernetes cluster overhead, Nginx Ingress, and static IP management. Cloud Run handles TLS, auto-scaling, and routing automatically. Full migration documented in [`docs/MIGRATION_GKE_TO_CLOUDRUN.md`](MIGRATION_GKE_TO_CLOUDRUN.md).

---

## 2. Recommendations for Production Rollout

As AnonyHealth moves beyond the prototype stage, the following enhancements should be prioritized.

### 2.1 Authentication & Onboarding

- **Email Verification:** Enable Supabase Auth email confirmation requirement before granting access to provider-gated features. Currently optional.
- **Terms & Consent Gateway:** Introduce a mandatory consent step during patient registration for HIPAA privacy practices and telehealth consent — store timestamp in `patient_profiles`.
- **MFA for Providers:** Enforce TOTP multi-factor authentication for provider accounts via Supabase Auth MFA (available in Pro tier).

### 2.2 Database & RLS Hardening

- **Audit all RLS policies:** The current schema uses `auth.uid()` isolation. Validate that no cross-tenant data leakage is possible by running Supabase's built-in RLS testing tools.
- **Encrypt sensitive fields:** PHI fields in `patient_profiles` (DOB, address) should use Supabase Vault (`pgsodium`) for column-level encryption at rest.
- **Backup strategy:** Enable Supabase Point-in-Time Recovery (PITR) for the production database.

### 2.3 Frontend Security

- **Content Security Policy:** Review `nginx.conf` CSP directives to ensure all required external endpoints (Supabase, Anthropic, Stripe, Calendly) are explicitly whitelisted.
- **Rate limiting:** Add Cloud Armor rules or Cloud Run concurrency limits to prevent abuse of the AI triage endpoint.
- **Environment secrets:** All secrets (`ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, etc.) must remain in Supabase Vault or GCP Secret Manager — never in the client bundle.

### 2.4 Observability & Monitoring

- **Cloud Run logging:** Enable structured JSON logging in the Nginx container and route to Google Cloud Logging.
- **Supabase Edge Function monitoring:** Alert on high error rates from the `aichat` function (HTTP 5xx responses).
- **Uptime monitoring:** Configure a simple uptime check on `https://anonyhealth.alpfr.com/healthz` via Google Cloud Monitoring or UptimeRobot.

### 2.5 CI/CD & Deployment

- **Automated Cloud Build trigger:** Currently deployments require `gcloud builds submit` manually. Configure a Cloud Build trigger on `git push origin main` for automatic production deploys.
- **Staging environment:** Add a `staging` branch that deploys to a separate Cloud Run revision before promoting to production traffic.
- **Smoke test gate:** Integrate `scripts/smoke-test.sh` as a post-deploy step in `cloudbuild.yaml` to verify the live app before routing 100% of traffic.

### 2.6 HIPAA & Compliance (for paid clinical use)

- **Business Associate Agreements (BAA):** Obtain BAAs from Supabase, Google Cloud, Anthropic, and Stripe before handling real patient PHI.
- **Audit log retention:** The current `audit_logs` table is append-only. Establish a retention policy and periodic export to cold storage.
- **Telehealth consent:** Add state-specific telehealth consent forms per Maryland HB 123 and equivalent requirements for other states.

---

## 3. Known Remaining Items

| Priority | Item | File | Status |
|---|---|---|---|
| 🟢 Low | `alert()` on invite generation failure | `DoctorDashboardMobile.jsx:40` | Pending |
| 🟢 Low | Appointment date off-by-one (timezone shift) | `BookAppointmentMobile.jsx:151` | Pending |
| 🔵 Roadmap | SOAP note / FHIR export | `PatientDetailMobile.jsx` | Future release |
| 🔵 Roadmap | CPT/ICD-10 billing suggestions | `PatientDetailMobile.jsx` | Future release |
| 🔵 Roadmap | Telehealth video integration | — | Future release |
