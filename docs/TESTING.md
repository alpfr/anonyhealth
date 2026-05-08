# AnonyHealth — End-to-End Test Script

A walkthrough for QA / smoke-testing the full provider and patient flow,
including the in-app appointment request system.

**App URL:** the public ingress for the GKE service. Use a fresh incognito
window for each persona so sessions don't collide.

**Two test accounts you'll need:**
- A real email you can receive at, for the **provider** (e.g. `you+drsmith@gmail.com`)
- A second real email for the **patient** (e.g. `you+patient@gmail.com`)

If your Supabase auth has email confirmation on, both accounts will receive
a 6-digit OTP — keep both inboxes open.

---

## Part 1 — Provider onboarding

### 1.1 Land on signup
- Open app URL in a fresh incognito window → public landing page renders
- Click **Sign up as provider** (or navigate to `/signup`)
- ✅ Email and password fields are visible while typing (regression check on
  the dark-mode input fix)

### 1.2 Create the provider account
- Email: `you+drsmith@gmail.com`
- Password: meets policy (8+ chars, upper, lower, digit) e.g. `TestPass1`
- Click **Create provider account**
- ✅ Page transitions to the OTP screen with "We sent a 6-digit code…"
- Copy the OTP from your inbox, paste, click **Verify**
- ✅ App proceeds to the doctor onboarding flow (since this user has no `tenant`)

### 1.3 Doctor onboarding (create the practice)
- Fill **Practice name** (e.g. `Smith Family Health`)
- Submit
- ✅ Lands on the **billing inactive** screen (no Stripe subscription yet)

### 1.4 Start trial / pay
- Click **Start trial** (Stripe Checkout opens)
- Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP
- Complete checkout → Stripe redirects back to `/billing/success`
- ✅ App polls `sync-subscription`; trial status appears within ~15s. Dashboard appears.

### 1.5 Provider profile
- Tap **Settings** (top-right of dashboard)
- ✅ "Manage your account and privacy" header is visible
- Tap **Provider profile**
- Fill: Display name, Credentials, Specialty, Bio
- **Leave Scheduling link blank** (so the in-app booking flow is exercised in Part 2)
- Click **Save & close**
- ✅ Green "Saved" toast → auto-redirects to Settings within ~1s
- ✅ The "Done" button also returns to Settings without saving

### 1.6 Generate patient invite
- Back to dashboard → **Invite a patient** card → **Generate invite link**
- ✅ A `https://<app>/invite/<token>` URL appears
- Click **Copy link** — keep this URL for Part 2

---

## Part 2 — Patient onboarding

### 2.1 Open the invite
- New incognito window (so you're signed out) → paste the invite URL
- ✅ "You're invited" page renders with email/password fields

### 2.2 Create the patient account
- Email: `you+patient@gmail.com`
- Password: `TestPass1`
- Click **Create account**
- If OTP required: copy from inbox, verify
- ✅ "Joining practice…" appears briefly, then **Complete your profile** form

### 2.3 Patient profile (the gate)
- Full name: `Alex Patient`
- Date of birth: a valid past date
- Address: any
- Tick the consent checkbox (links to `/privacy` and `/hipaa` work in a new tab)
- Click **Save and continue**
- ✅ Patient dashboard appears with provider banner showing the doctor's
  display name and avatar/initial
- ✅ Bottom nav appears (was hidden during the gate)

### 2.4 Provider banner CTA
- ✅ "Book appointment →" button is visible (because we left scheduling URL
  blank in 1.5)

---

## Part 3 — Booking flow (in-app)

### 3.1 Patient submits a request
- Click **Book appointment →**
- Pick a date (any future date)
- Pick a time-of-day window (Morning / Afternoon / Evening)
- Pick urgency
- Reason: `Annual physical, persistent cough`
- Click **Send request**
- ✅ Form clears; the request appears below in **Your requests** with status
  **Awaiting provider**

### 3.2 Provider sees the request
- Switch to the provider window (re-sign-in if needed)
- Dashboard → **Appointment requests** tile (above the Patients list)
- ✅ Inbox shows: patient name, preferred date/window, urgency, reason
- ✅ Filter chips: **Open** (default) / **All**

### 3.3 Confirm with the requested time
- Click **Confirm** on the request
- ✅ Action sheet opens, datetime pre-seeded to a sensible time matching the
  patient's window
- Optionally type a note: `Please bring insurance card`
- Click **Send**
- ✅ Inbox refreshes; status becomes **Confirmed**

### 3.4 Patient sees the confirmation
- Switch to patient window → bottom nav → **Book appointment** (or refresh
  dashboard)
- ✅ Request status now **Confirmed**, with the proposed time and the
  provider's note
- Cancel button is still available

### 3.5 Counter-proposal flow
- Patient: submit a second request with different details
- Provider: click **Propose time** → pick a different datetime + note → **Send**
- ✅ Provider inbox: status **Awaiting patient**
- ✅ Patient view: status **New time proposed**, with the provider's suggested time

### 3.6 Decline flow
- Patient: submit a third request
- Provider: click **Decline** → optional note → **Send**
- ✅ Provider inbox: status **Declined**
- ✅ Patient view: status **Declined** with note

### 3.7 Patient cancellation
- Patient: on any request still in `requested`/`counter_proposed`/`confirmed`,
  click **Cancel request**
- ✅ Status changes to **Cancelled**

---

## Part 4 — AI Triage

### 4.1 Run a triage session
- Patient dashboard → **Talk to AI Triage** input
- Type: `I have a sore throat and mild fever`
- Press Enter → AI Chat screen opens, response streams
- ✅ Response includes general advice followed by structured severity (no
  `<metadata>` XML visible in the rendered text)
- Back to dashboard → **Recent triage** shows the new entry with severity pill

### 4.2 Provider sees triage history
- Provider dashboard → click the patient row
- ✅ Patient detail shows triage entries

---

## Part 5 — Messaging

- Patient: bottom nav → **Messages** → send `Hi, quick question`
- Provider: dashboard → patient → **Message** → reply
- ✅ Both directions deliver; bubbles ordered chronologically

---

## Part 6 — Email notifications (only if `RESEND_API_KEY` is set)

After each appointment transition, both inboxes should receive an email:

| Trigger                    | Patient inbox                                      | Provider inbox                                          |
| -------------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| Patient sends request      | "Your appointment request was received"            | "New appointment request — Alex Patient"                |
| Provider confirms          | "Appointment confirmed — <date>"                   | "Confirmed appointment — Alex Patient at <date>"        |
| Provider counter-proposes  | "Provider proposed a different time"               | (none)                                                  |
| Provider declines          | "Appointment request — please contact provider"    | (none)                                                  |
| Patient cancels            | "Your appointment request was cancelled"           | "Appointment cancelled — Alex Patient"                  |

If `RESEND_API_KEY` is **not** set, check function logs instead:
https://supabase.com/dashboard/project/exzmdnnkbjjgrtwnjemm/functions/send-appointment-email/logs

You should see `[email-stub] to=…` lines for each transition.

---

## Part 7 — Negative paths (sanity)

| Test                                                                       | Expected                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Provider tries to set scheduling URL = `https://calendly.com` (no handle)  | Save blocked: "Scheduling link needs your handle…"                    |
| Patient submits booking with empty Reason                                  | Send button disabled                                                  |
| Doctor lets trial expire (or cancels via Settings → Manage billing)        | Doctor lands on **Billing inactive**; patient writes blocked by RLS   |
| Sign in with wrong password                                                | Inline error "Invalid login credentials"                              |
| Open `/invite/<bogus-token>`                                               | "Invite is invalid, expired, or already used"                         |
| Patient tries to view another patient's data                               | Empty (RLS hides everything)                                          |

---

## Part 8 — Cleanup (optional)

- Provider: Settings → **Manage billing** → cancel subscription (Stripe portal)
- Tenant data export: hit the `export-tenant` Edge Function from the Supabase
  dashboard if you want a snapshot before purge

---

## What "pass" looks like

- ✅ Provider goes from sign-up → trial → invite generation in under 5 minutes
- ✅ Patient goes from invite click → confirmed appointment in under 2 minutes
- ✅ Every status transition reaches both inboxes (or both log lines)
- ✅ Sign-in input text remains readable in dark-mode browsers and after autofill
- ✅ No console errors in DevTools throughout the flow

---

## Pre-test checklist for the test environment

- [ ] Supabase migration `20260427_appointment_requests.sql` applied
- [ ] Edge function `send-appointment-email` deployed
- [ ] Secrets set on Supabase: `ANTHROPIC_API_KEY`, `STRIPE_*`, `SUPABASE_*`,
      `ALLOWED_ORIGINS`, optionally `RESEND_API_KEY` + `APPOINTMENT_FROM_EMAIL`
- [ ] GKE deployment `anonyhealth` healthy: `kubectl get pods -l app=anonyhealth`
- [ ] DNS / ingress resolves to the app URL with a valid TLS cert
- [ ] Stripe is in **test mode** with a price ID matching `STRIPE_PRICE_ID_DOCTOR_MONTHLY`
