# AnonyHealth — v1 Launch Checklist

This is your end-to-end checklist to take the platform from code-complete to 5 paying providers. Treat each section as a gate — don't move past it until every box is checked.

The product is "private practice in a browser": doctor pays $49/mo, brings their own patients via invite, AI triage + secure messaging + per-patient history. No public directory, no patient-pays-provider yet.

---

## A. Apply pending migrations + redeploy functions

Run in order against the production Supabase project (`exzmdnnkbjjgrtwnjemm`).

**Migrations** (Supabase Dashboard → SQL Editor → paste + Run):

- [ ] `supabase/migrations/20260424_messaging.sql` — adds `messages` table + RLS + extends audit allowlist.
- [ ] `supabase/migrations/20260424_provider_profiles.sql` — adds `provider_profiles` table + RLS.

**Edge Functions**:

```bash
cd /Users/alpfr/Downloads/scripts/anonyhealth
supabase functions deploy stripe-checkout sync-subscription log-audit
```

- [ ] `stripe-checkout` deployed (now seeds `subscriptions` row with customer id at Checkout time).
- [ ] `sync-subscription` deployed (new — drives polling-based sub activation).
- [ ] `log-audit` redeployed (allowlist extended for `phi.read`, `message.send`, `message.read`).

---

## B. Stripe (test mode → live)

### Test mode (do everything here first)
- [ ] Confirm `STRIPE_SECRET_KEY` is `sk_test_...`
- [ ] Confirm `STRIPE_PRICE_ID_DOCTOR_MONTHLY` is a recurring monthly price (e.g., $49)
- [ ] Webhook endpoint configured: `https://exzmdnnkbjjgrtwnjemm.supabase.co/functions/v1/stripe-webhook`
- [ ] Webhook events selected: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
- [ ] Smoke-tested doctor signup → trial activates within ~5 seconds via `sync-subscription`

### Going live
- [ ] Stripe account fully activated (business info, bank account, tax ID)
- [ ] Replace `STRIPE_SECRET_KEY` with `sk_live_...` (Supabase Secrets)
- [ ] Create live-mode product + recurring price; replace `STRIPE_PRICE_ID_DOCTOR_MONTHLY`
- [ ] Create live-mode webhook endpoint; replace `STRIPE_WEBHOOK_SECRET`
- [ ] Verify `1` active subscription in live mode by yourself (real card, refund yourself)

---

## C. Compliance + BAAs (the legal floor)

Without these you cannot legally process PHI in the US.

- [ ] **Supabase Team plan** ($599/mo minimum). Sign their BAA.
- [ ] **Anthropic** — request BAA via your enterprise contact. If unavailable, **disable AI Chat in production** (set the function as off in `config.toml` and remove the Chat tab from BottomNav) until you have one.
- [ ] **Stripe** — they sign BAAs for healthcare; request via dashboard. Required only if PHI ever flows through Stripe (which it does NOT in our setup — but get the BAA anyway as defense).
- [ ] **Google Cloud** (frontend hosting in GKE) — automatic BAA available; enable in your Workspace admin or sign separately.
- [ ] **Email provider** — when you set up SMTP for OTP/transactional emails, choose Postmark/SendGrid/Mailgun and sign their BAA. Today you're using Supabase's built-in email which has tight rate limits and no BAA.

### Legal docs
- [ ] Lawyer reviews `src/screens/LegalPage.jsx`. Replace every `{{PLACEHOLDER}}`.
- [ ] Confirm `EFFECTIVE_DATE`, `COMPANY_LEGAL_NAME`, `COMPANY_ADDRESS`, `PRIVACY_EMAIL`, `SUPPORT_EMAIL`, governing law, dispute venue.
- [ ] Add a one-click PDF export of HIPAA Notice for patients (regulators may ask).
- [ ] Document your Security Incident Response Plan (a 1-page runbook is enough for now).

### Telehealth licensing
- [ ] Add a provider-onboarding question: "In which states are you licensed to practice?" Store as an array.
- [ ] Block patient invites to states the provider is not licensed in (or surface a warning + log the violation).
- [ ] Have legal confirm Maryland-specific compliance language in the patient consent flow (referenced in old README; verify still applicable to your model).

---

## D. Production readiness

### Frontend (already on GKE via Cloud Build)
- [ ] Custom domain SSL active (current: `anonyhealth.opssightai.com`). Decide if rebranding to `anonyhealth.com`.
- [ ] Cloud Build trigger fires reliably on push to `main` (verified working).
- [ ] HPA scales reasonably (verify under load: see `hpa.yaml`).
- [ ] **GCP IP quota raised** — the cluster autoscaler hit `IN_USE_ADDRESSES` quota of 8 in `us-central1`. Request bump to 32+ before you have any real traffic.

### Backend
- [ ] All Edge Functions return 200 in their Invocations tab; no recurring 4xx/5xx
- [ ] `audit_logs` is filling in under normal use (verify after a smoke test)
- [ ] Scheduled `purge_expired_tenants` cron job is registered (verify with `select * from cron.job;` in SQL Editor)
- [ ] DB backups: Supabase free tier is daily; Team tier is point-in-time recovery — confirm tier matches your retention needs

### Observability
- [ ] Wire **Sentry** (or equivalent) into the React app for client-side error tracking. ~30 min.
- [ ] Hook **Cron monitor** for `purge-expired-tenants-daily` — alert if it doesn't run.
- [ ] Set up **Stripe webhook failure alerts** (Stripe dashboard → Developers → Webhooks → "Notify on failure").
- [ ] Uptime check on `https://anonyhealth.opssightai.com` and `https://exzmdnnkbjjgrtwnjemm.supabase.co/auth/v1/health` (Better Uptime, Pingdom, or GCP Cloud Monitoring uptime).

### Security
- [ ] Rotate all secrets one final time before launch (publish keys, JWT, Stripe keys, Supabase service role)
- [ ] Run `npm audit` — fix any high/critical
- [ ] Verify CSP headers (already set in `nginx.conf` from phase 5)
- [ ] Penetration test (or at minimum: have a security-conscious friend try to break the auth + RLS)

---

## E. Pricing + commercial setup

- [ ] Stripe live mode price is set
- [ ] Receipts on (Stripe → Settings → Customer emails)
- [ ] Refund policy documented in Terms (currently template — fill in window + criteria)
- [ ] Trial-end email reminder configured (Stripe → Subscriptions → Trial settings)
- [ ] Failed-payment dunning configured (Stripe Smart Retries)

---

## F. Pilot — first 5 providers

The fastest validation. Don't run paid acquisition yet.

- [ ] List 10 candidate providers you can reach personally (LinkedIn, alumni network, conferences). Include name, specialty, why they'd care.
- [ ] Reach out 1:1 — short message, problem statement, 14-day trial offer, ask for a 15-min demo.
- [ ] Get 5 to sign up and complete onboarding. Watch their flow over a screen-share for the first.
- [ ] Capture qualitative feedback in a doc — what confused them, what they wanted, what they'd pay double for.
- [ ] Iterate on **one** issue per week from that feedback.

After 5 paying providers, you have validation. Only then consider:
- Public provider directory (Phase 14+ from earlier multi-tenant doc)
- Stripe Connect for patient→provider payments
- Mobile apps
- Insurance billing

---

## G. Things explicitly NOT in v1

Track these in a follow-up doc; don't build until 5 providers pay.

- Public provider directory + patient discovery
- Patient pays provider per visit (Stripe Connect)
- Video consultations (use Doxy.me or Spruce link out)
- Insurance billing / SuperBills
- Prescription writing
- Native mobile apps
- Multi-state telehealth licensing automation
- Multi-doctor clinics
- Custom branding per tenant
- SSO

---

## H. Pre-launch sanity walkthrough

Final pass an hour before you flip to live mode. Use a real card on a real account, refund yourself afterward.

1. Visit https://anonyhealth.opssightai.com → **landing page** loads.
2. Click "Start 14-day free trial" → **/signup** → enter email + strong password → 6-digit OTP arrives in real inbox.
3. Verify OTP → "Start your practice" screen with sign-out button visible.
4. Enter practice name → Stripe Checkout → real card → **redirect to /billing/success**.
5. Within 10s land on doctor dashboard. Subscription shows `trialing`.
6. **Settings → Provider profile** → fill in display name, credentials, specialty, bio. Save.
7. **Generate invite link** → copy → open in incognito.
8. Sign up as patient via invite → OTP → joined tenant.
9. Patient dashboard shows the provider banner with credentials + bio + specialty.
10. AI Chat → triage session → history entry written.
11. Patient → Messages → send "Hello" → Doctor receives in real time on their patient detail.
12. Doctor opens Messages from patient detail → reads + replies. Patient sees reply in real time.
13. Doctor → Settings → Export my data → JSON download includes all of the above.
14. Doctor → Settings → Manage billing → Stripe Portal opens → cancel subscription.
15. Doctor lands on BillingInactive screen → tenant marked for 30-day purge.
16. Reactivate via portal → return → BillingInactive clears → back on dashboard.
17. Verify legal pages: /terms, /privacy, /hipaa render correctly with placeholders filled.
18. Refund yourself in Stripe.

Any failure here → fix, redeploy, retest. Don't ship until all 18 pass.

---

## I. Day-of-launch

- [ ] Flip Stripe to live mode (Section B)
- [ ] Confirm BAAs all signed and on file (Section C)
- [ ] Send the 5 pilot invitations
- [ ] Watch error rates and Stripe events for the first 48 hours
- [ ] Don't add features. Just respond to support.
