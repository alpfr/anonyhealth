# AnonyHealth MVP — Tester Guide

Welcome, and thank you for testing AnonyHealth. This guide walks you through
the key user flows on the platform. Plan to spend **45-60 minutes** going
through everything.

If you find any issues, please note them on the [Bug Report Template](#bug-report-template)
at the bottom of this doc.

## What is AnonyHealth?

AnonyHealth is a privacy-first healthcare platform. Patients can use AI
triage anonymously (no account required), and they upgrade to a real account
only when they want to message a provider or book an appointment.

The platform has two user types:
- **Patients** — receive AI triage, message providers, book appointments
- **Providers** — healthcare professionals who manage their practice

## Before You Start

### What you need
- A modern browser (Chrome, Firefox, Safari, or Edge — latest version)
- Email address you can check (for sign-up verification)
- About 60 minutes of uninterrupted time
- This guide open in a separate window/tab

### How to set up
1. Open the production URL: **https://anonyhealth.alpfr.com**  
   *(Direct Cloud Run fallback if needed: https://anonyhealth-cg4uqokewq-uc.a.run.app)*
2. Use an **incognito / private** window for each test scenario to start fresh
3. Have your phone or tablet handy to test mobile responsiveness

### A note on privacy
The site auto-creates an "anonymous" session for first-time visitors. This is
intentional — it lets you try the AI triage without giving any personal info.
Real personal info is only collected during sign-up.

---

## Scenario 1: Anonymous User Tries AI Triage (10 min)

This is the most common first-time visitor flow. The platform should never
force someone to sign up just to try the AI triage.

### Steps

| # | Action | Expected Result |
|---|---|---|
| 1.1 | Open https://anonyhealth.alpfr.com in a fresh incognito window | Page loads in under 3 seconds |
| 1.2 | Look at the top-right of the screen | You see a pill labeled "Anonymous" with a chevron |
| 1.3 | Look near the top of the page | You see a banner: "You're anonymous — No personal info collected" with a "Save" button |
| 1.4 | Look at the dashboard | You see "Talk to AI triage, privately." headline (NOT a sign-in form) |
| 1.5 | Tap or click "Chat" in the bottom navigation | Goes to the AI Chat screen |
| 1.6 | Type "I've had a sore throat for 3 days" and press Enter | Within 5 seconds, an **Intake Agent** label (blue) appears with a question |
| 1.7 | Answer the question naturally (e.g., "Yes, with some fever") | Intake Agent asks another follow-up question |
| 1.8 | Continue answering 3-5 questions | After enough info, the **Triage Agent** label (amber/orange) appears |
| 1.9 | Read the Triage Agent's assessment | It has multiple sections: what you're experiencing, what it suggests, red flags, what to do next |
| 1.10 | Look at the input field at the bottom | It's locked with "Assessment complete" placeholder |
| 1.11 | Scroll down to see if there's a CTA after the assessment | You see "SAVE SESSION TO BOOK APPOINTMENT →" button |

### Things to verify
- [ ] Auto-anonymize works — no sign-in wall on the landing page
- [ ] Both agent labels (blue Intake, amber Triage) appear correctly
- [ ] AI responses feel natural and conversational, not robotic
- [ ] Triage agent never tries to diagnose (e.g., it shouldn't say "you have strep throat")
- [ ] Emergency keywords (e.g., "chest pain") should trigger an immediate emergency response

### Try this edge case
Start a new chat and type: **"I'm having severe chest pain and trouble breathing"**

The agent should immediately direct you to call emergency services. It should NOT continue with normal intake questions.

---

## Scenario 2: Anonymous User Saves Their Session (10 min)

When an anonymous user wants to message a provider or book, they need to
upgrade to a real account. Their chat history should carry over.

### Steps

| # | Action | Expected Result |
|---|---|---|
| 2.1 | After completing Scenario 1 (so you have triage history), tap the "Save" button on the anonymous banner OR the "SAVE SESSION TO BOOK APPOINTMENT" button | Goes to /signup page |
| 2.2 | Look at the page heading | Says "Save your session" (not "Create your account") |
| 2.3 | Look at the helper text | Mentions saving triage history and booking appointments |
| 2.4 | Enter a real email you can check and a strong password (min 8 chars, uppercase, lowercase, digit) | Form accepts input |
| 2.5 | Click "Save your session" | Either signs you in immediately OR shows OTP code form |
| 2.6 | If OTP form appears: check your email for a 6-digit code, enter it | Signs you in |
| 2.7 | After sign-in, look at the dashboard | "Anonymous" pill is gone; you see your email or username in the profile menu |
| 2.8 | Tap History (clock icon in bottom nav) | Your earlier triage session should still appear in the list |

### Things to verify
- [ ] Account creation completes within 30 seconds
- [ ] Chat history persists from anonymous to authenticated state
- [ ] No browser errors in the console (open DevTools → Console)

---

## Scenario 3: Fresh Visitor Tries to Sign Up as Patient (5 min)

By design, patients should join through provider invite links. Direct patient
signups should be blocked with a clear explanation.

### Steps

| # | Action | Expected Result |
|---|---|---|
| 3.1 | Open a **fresh incognito window** | New session |
| 3.2 | Navigate directly to: https://anonyhealth.alpfr.com/signup | Page loads |
| 3.3 | Look at the role selector at the top | Two tabs: "I'm a patient" and "I'm a provider" |
| 3.4 | Make sure "I'm a patient" is selected (it should be by default) | Active tab is highlighted |
| 3.5 | Look at the form area | You see an **invite link** input, NOT email/password fields |
| 3.6 | Read the helper card | It explains "Patients join through an invite link" |
| 3.7 | Try pasting a random string like "abcdef" and click "Use invite" | Shows error: "That doesn't look like a valid invite link" |
| 3.8 | Look for alternative paths at the bottom | You see "Already have an account? Sign in" and "Just want to try AI triage? Continue anonymously" |
| 3.9 | Click "Continue anonymously" | Goes to the anonymous dashboard |

### Things to verify
- [ ] Direct patient signup is blocked (no email/password fields shown)
- [ ] Error message is clear when an invalid invite is pasted
- [ ] Two clear alternative paths offered (sign in, anonymous)

---

## Scenario 4: Fresh Visitor Signs Up as Provider (10 min)

Providers should be able to sign up directly (unlike patients).

### Steps

| # | Action | Expected Result |
|---|---|---|
| 4.1 | Fresh incognito → https://anonyhealth.alpfr.com/signup | Page loads |
| 4.2 | Switch the role toggle to "I'm a provider" | Active tab changes |
| 4.3 | Look at the helper copy | Mentions "Healthcare providers" or similar |
| 4.4 | Email/password fields should now be visible | Form ready for input |
| 4.5 | Enter a real email and strong password | Form accepts input |
| 4.6 | Click "Create provider account" | Either signs you in OR shows OTP code |
| 4.7 | Complete verification if needed | Signs you in |
| 4.8 | After sign-in, you should see provider onboarding (practice details, etc.) | Onboarding screen loads |

### Things to verify
- [ ] Provider signup works normally (this path is unchanged from earlier versions)
- [ ] Role selector preserves selection if you refresh the page

---

## Scenario 5: Identity Tier UI Consistency (5 min)

The profile menu in the top-right should always show the correct identity tier.

### Steps

| # | Action | Expected Result |
|---|---|---|
| 5.1 | While signed in as a patient, click the profile pill (top-right) | Dropdown opens |
| 5.2 | Check the dropdown contents | Shows email, "Settings" and "Sign out" items |
| 5.3 | Click "Sign out" | Returns to the landing page; you're now anonymous again |
| 5.4 | Click the profile pill again | Now shows "Anonymous", "Save my session", "Start fresh", "Sign in" |
| 5.5 | Click "Start fresh" | Page reloads with a fresh anonymous session (history cleared) |

### Things to verify
- [ ] Profile menu always reflects current identity state
- [ ] Sign-out is reachable in ONE tap (no need to go through Settings)
- [ ] "Start fresh" actually creates a new anonymous session

---

## Scenario 6: Mobile Responsiveness (10 min)

Open the site on your phone or use browser DevTools' mobile view.

### Steps

| # | Action | Expected Result |
|---|---|---|
| 6.1 | Open https://anonyhealth.alpfr.com on your phone | Page loads, fits the screen, no horizontal scroll |
| 6.2 | Tap "Chat" → start a triage session | Chat input is reachable; keyboard doesn't cover it |
| 6.3 | Type a message and watch for AI response | Streaming response is smooth |
| 6.4 | Scroll up to see earlier messages | Smooth scrolling, no jank |
| 6.5 | Try the profile menu (top-right) | Dropdown opens correctly, doesn't get cut off |
| 6.6 | Try the role selector on /signup | Tabs are tappable, easy to read |

### Things to verify
- [ ] No layout breaks on phone-sized screens (test both iPhone and Android if possible)
- [ ] Touch targets are at least 44x44px (standard iOS guideline)
- [ ] Touch targets are easy to tap
- [ ] Forms scroll properly when keyboard is open

---

## Scenario 7: Privacy + Security Sanity Checks (5 min)

These are quick checks to verify the privacy claims hold up.

### Steps

| # | Action | Expected Result |
|---|---|---|
| 7.1 | Open DevTools (F12 or Cmd+Opt+I) → Network tab | Recording starts |
| 7.2 | Use AI Triage to send "I have a sore throat" | Watch the network requests |
| 7.3 | Look at the request body for the `/functions/v1/intake` call | Body contains "I have a sore throat" — confirms it's going to YOUR Supabase, not a third party |
| 7.4 | Check the request URL — should be `*.supabase.co` | Domain matches your project |
| 7.5 | Look at Console tab for errors | No errors logged during normal use |
| 7.6 | Try opening https://anonyhealth.alpfr.com with HTTP (replace https→http) | Should redirect to HTTPS |

### Things to verify
- [ ] All network requests go to known domains (anonyhealth.alpfr.com, supabase.co, anthropic.com via your backend)
- [ ] No personal data leaks to third-party domains (no requests to Google Analytics, Facebook, etc.)
- [ ] HTTPS is enforced

---

## Scenario 8: Provider Appointment Workflow (10 min)

This tests the full appointment request cycle from a patient submitting a request
to a provider confirming or counter-proposing a time. **You need a provider account
and a patient account** (use two different browsers or incognito windows).

### Steps

| # | Action | Expected Result |
|---|---|---|
| 8.1 | Sign in as a **patient** with an active provider connection | Patient dashboard shows provider banner with "Book appointment →" |
| 8.2 | Click "Book appointment →" | Opens the appointment request form |
| 8.3 | Pick a preferred date (tomorrow or later), select a time window, set urgency, enter a reason | All fields accept input |
| 8.4 | Click "Send request" | Button shows "Sending…" then clears the form |
| 8.5 | Scroll down under the form | Your new request appears in "Your requests" with status **Awaiting provider** |
| 8.6 | **Switch to the provider browser** — go to provider dashboard → "Appointment requests" | The new patient request appears in the list |
| 8.7 | Click "Confirm" on the request | Status changes to **Confirmed** |
| 8.8 | **Switch back to patient browser** — refresh the appointment screen | Request now shows **Confirmed** in green |
| 8.9 | Back in the **provider browser**, find a different request and click "Propose new time" | A date/time input appears |
| 8.10 | Enter a new proposed time and submit | Status changes to **New time proposed** |
| 8.11 | In the **patient browser**, check the request | Shows **New time proposed** in blue with the provider's note |
| 8.12 | Patient clicks "Cancel request" on a pending request | Status changes to **Cancelled** |

### Things to verify
- [ ] Appointment requests appear immediately for the provider without a page refresh
- [ ] Status labels and colors are correct (amber=awaiting, green=confirmed, blue=counter-proposed, red=declined)
- [ ] Provider note is visible to the patient on counter-proposals
- [ ] Cancelled requests cannot be re-opened
- [ ] No errors appear in the browser console during any step

---

## Scenario 9: Provider Profile & Scheduling Link (5 min)

Tests that the provider's public profile and booking URL are surfaced correctly
to patients.

### Steps

| # | Action | Expected Result |
|---|---|---|
| 9.1 | Sign in as a **provider** → go to Settings → "Provider profile" | Profile form loads with any previously saved info |
| 9.2 | Fill in: Display name, Credentials (e.g. MD), Specialty, a short Bio | All fields accept input |
| 9.3 | In the "Scheduling link" field, enter your **root Calendly URL** (e.g. `calendly.com/your-name`) | A ⚠️ warning appears immediately below the field explaining you need to add the event name |
| 9.4 | Update the URL to the **specific event** (e.g. `calendly.com/your-name/telehealth-appointment`) | Warning disappears |
| 9.5 | Click "Test link in new tab" | A new tab opens directly on that specific Calendly event booking page |
| 9.6 | Click "Save & close" | Shows "Saved HH:MM" confirmation for ~2 seconds, then returns to the previous screen |
| 9.7 | **Switch to a patient browser** connected to this provider | Patient dashboard shows the provider banner with the correct name, credentials, and specialty |
| 9.8 | Click "Book appointment →" on the patient dashboard | Opens the **specific Calendly event** (not the root profile page) |

### Things to verify
- [ ] Warning appears for root-level Calendly URLs (missing event slug)
- [ ] Warning disappears once a proper event URL is entered
- [ ] "Test link" opens the correct event in a new tab
- [ ] "Saved HH:MM" confirmation is readable before the screen dismisses
- [ ] Patient sees updated provider name, credentials, and specialty
- [ ] Booking link opens the correct appointment type — **not** the root Calendly profile

---

## Bug Report Template

When you find an issue, please copy this template into a new GitHub issue
(or email me) with the details filled in:

```
**Title:** [short summary]

**Scenario:** [which test scenario above, e.g. "Scenario 1, step 1.5"]

**What I did:**
1. ...
2. ...

**What I expected:**
...

**What actually happened:**
...

**Severity (your judgment):**
- [ ] Critical (blocks core functionality)
- [ ] High (broken feature, workaround exists)
- [ ] Medium (UX issue, doesn't block use)
- [ ] Low (cosmetic, polish)

**Environment:**
- Browser: [Chrome 120, Safari 17, etc.]
- OS: [macOS Sonoma, Windows 11, iOS 17, Android 14, etc.]
- Device: [Desktop, iPhone 15, etc.]
- URL where it happened: https://anonyhealth.alpfr.com/...

**Screenshots / video:**
[attach if you can]

**Browser console output:**
[paste any red error messages from DevTools → Console]
```

---

## Summary Checklist

After running through all scenarios, fill this out:

| Scenario | Pass | Fail | Notes |
|---|---|---|---|
| 1. Anonymous AI triage | ☐ | ☐ | |
| 2. Save session upgrade | ☐ | ☐ | |
| 3. Patient signup blocked | ☐ | ☐ | |
| 4. Provider signup | ☐ | ☐ | |
| 5. Identity tier UI | ☐ | ☐ | |
| 6. Mobile responsiveness | ☐ | ☐ | |
| 7. Privacy + security | ☐ | ☐ | |
| 8. Provider appointment workflow | ☐ | ☐ | |
| 9. Provider profile & scheduling link | ☐ | ☐ | |

**Overall verdict on MVP readiness:**

- [ ] ✅ Ready to ship — no blockers found
- [ ] ⚠️ Minor issues, ship with known issues documented
- [ ] ❌ Not ready — critical issues found

**Tester signature:** ________________________  **Date:** ____________

---

## Questions or Issues?

If you get stuck during testing or have questions about expected behavior,
contact: **Adetola Adesanya** (adetola.adesanya@alpfr.com)

Thank you for helping us validate AnonyHealth!
