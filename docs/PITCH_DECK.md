# AnonyHealth: Privacy-First Triage Pitch Deck

**Target Audience:** State Health Departments, Large Health Systems, specialized tele-therapy organizations (like behavioral health), and Telehealth Platforms tracking anonymous entryways.

---

## 1. The Core Problem
**Fear of exposure prevents patients from seeking specialized healthcare.**
- Whether dealing with mental health, specialized reproductive care, or highly stigmatized conditions, a significant portion of the population refuses to enter standard healthcare triage systems due to fear of their data being exposed, logged, or shared across systems without their consent.
- Current hospital front-doors force patients to hand over their identity *before* they ever figure out if they actually need care or which provider is right for them.

## 2. The Solution: AnonyHealth
**AnonyHealth flips the funnel: Symptom triage first, identity second.**

AnonyHealth connects patients with a comprehensive AI-driven symptom checker, triages their condition confidentially using an isolated Claude AI engine, and matches them with an appropriate provider *all before recording their full identity into the database*.

It’s an impenetrable, privacy-first mobile prototype engineered with strict state compliances seamlessly built-in (e.g., Maryland Telehealth Compliance restrictions).

---

## 3. Key Differentiators & Features

### 🕵️ Confidential AI Symptom Checker
AnonyHealth bypasses human judgment in the first step. Anthropic’s Claude acts as an empathetic, lightning-fast edge function triage agent. It analyzes user symptoms within an encrypted chat window, generating a clinically-sound severity score (1-10) locally on the device.

### 🔒 Disconnected PII Storage
To meet compliance, telemedicine *must* eventually verify identity (Name, DOB). However, AnonyHealth explicitly isolates the patient's identity in a walled-off database schema (the `patient_profiles` table). The actual symptom triage log (`health_logs`) is only tied to an encrypted UUID. If the core app is breached, the symptoms and the identity are physically isolated.

### 🩺 Real-Time Interactive Provider Directory
The AI doesn't just stop at giving advice. It filters the Supabase-powered provider list to proactively surface doctors, specialists, or therapists matching the specific, anonymized severity of the patient's complaint (e.g. flagging Telehealth availability automatically).

---

## 4. The ROI & Use-Cases

1. **State Health Departments:** Use AnonyHealth as a robust digital front-door for localized, sensitive health crises. Route vulnerable populations immediately to state-sponsored care without scaring them away with heavy HIPAA intake forms.
2. **Specialized Clinics:** Eliminate the "abandoned cart" of healthcare intake. Convert highly hesitant individuals directly into clinical workflows because they trust the anonymity of the triage engine.
3. **Telehealth Providers:** Accelerate patient routing times. Instead of a nurse spending 15 minutes doing triage over a web portal, the patient enters the waiting room *already carrying an accurate AI symptom summary and severity score.*

---

## 5. The Pitch Delivery (Elevator Pitch)

*"Hi [Name], we built AnonyHealth to solve a critical adoption gap in your digital front door: the patients who are too afraid to share their identity for sensitive triage. Our platform lets patients interact securely with an AI symptom checker immediately and anonymously. It triages their condition, extracts severity metrics, matches them to one of your providers, and only asks for their identity at the absolute final compliant step. We bring the highest tier of data isolation and edge-AI logic directly into a secure mobile-native interface, driving higher patient conversion without compromising compliance."*
