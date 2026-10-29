# AnonyHealth — Interactive Clinical Workflow Simulation Guide

AnonyHealth includes a dedicated **Interactive Clinical Workflow Simulator** built to demonstrate the complete end-to-end patient triage and provider review journey. The simulator illustrates how the **Jev System 1 Deterministic Clinical Reflex Engine** safeguards patients with **0ms latency** and **$0 token cost**, while seamlessly transitioning non-emergent cases to multi-agent AI triage and automated clinical documentation.

---

## 🚀 How to Access the Simulation

| Environment | Access Link | Description |
| :--- | :--- | :--- |
| **Primary Domain** | [anonyhealth.alpfr.com/simulation.html](https://anonyhealth.alpfr.com/simulation.html) | Live branded web application |
| **Direct Cloud Run** | [anonyhealth-cg4uqokewq-uc.a.run.app/simulation.html](https://anonyhealth-cg4uqokewq-uc.a.run.app/simulation.html) | Direct Google Cloud Run container endpoint |
| **Local Dev** | `http://localhost:5173/simulation.html` | Served locally via Vite dev server |
| **Local File** | `open dist/simulation.html` | Fully self-contained offline browser executable |

---

## 🎬 Dual-Perspective Architecture

The simulation provides three real-time viewing modes:
1. **⚡ Dual View (Default):** Synchronized split-screen showing the Patient Mobile Phone on the left and the Doctor's Telehealth Review Portal on the right.
2. **📱 Patient Mobile:** Focused mobile phone experience (iPhone frame) with authentic intake screens, animated chat, and emergency modal intercepts.
3. **💻 Doctor Portal:** Clinical workstation displaying real-time SOAP note generation, CPT billing codes, and HL7 FHIR R4 JSON bundles.

![Dual View Simulation](/docs/images/simulation/01_sim_step1_intake.png)

---

## 🧭 5-Step Guided Story Tour

Users can click **▶️ Auto-Play Tour** or navigate manually via **◀ Prev / Next ▶**:

### Step 1: Anonymous Patient Intake (Zero PII)
- Demonstrates immediate access without passwords, email registration, or device fingerprinting.
- Ephemeral cryptographic tokens (`anon_id`) are maintained strictly in client memory.

### Step 2: Jev System 1 Deterministic Reflex (0.28ms, $0 Cost)
- Patient enters acute symptoms: *"I have severe crushing chest pain radiating to my left arm"*.
- The client-side Jev System 1 engine executes instantaneously:
  - **Latency:** `0.28ms`
  - **Token Cost:** `$0.0000` (100% free deterministic regex/WASM automata)
  - **Intercept Action:** Auto-launches the `EmergencyInterceptModal` with 1-tap `tel:911` emergency calling and `tel:988` Crisis Lifeline.
  - **Safety Lock:** Locks the chat input to "Assessment complete" to prevent conversational distraction during life-threatening events.

![Cardiac Emergency Intercept](/docs/images/simulation/02_sim_step2_cardiac_modal.png)

### Step 3: Bilingual Spanish & Stroke FAST Protocol
- Native Spanish emergency screening for: *"Tengo un dolor muy fuerte en el pecho y me falta el aire"*.
- Neurological stroke FAST screening (Facial droop, Arm weakness, Speech difficulty).
- Localized Spanish emergency intercept modals execute without translation server round-trips.

![Spanish Emergency Intercept](/docs/images/simulation/03_sim_spanish_scenario.png)

### Step 4: Multi-Agent AI Triage (Non-Emergent Symptoms)
- Non-emergent symptoms (*"Dull pressure headache across my forehead and slight eyestrain for two days"*) safely bypass the emergency intercept.
- Orchestrates:
  1. **Intake Agent:** Extracts symptom duration, onset, and negative red-flag confirmations.
  2. **Diagnostic Agent:** Differential diagnosis (Tension-type headache 85%, Eyestrain 15%).
  3. **Safety Arbiter:** Calculates Jev Risk Score (`14/100`, **LOW RISK**).

![Non-Emergent AI Triage](/docs/images/simulation/05_sim_headache_triage.png)

### Step 5: Healthcare Provider Review & FHIR Export
- Doctor receives the anonymized case summary in their clinical inbox.
- **1-Click Clinical SOAP Note:** Formatted Subjective, Objective, Assessment, and Plan ready for EHR pasting.
- **Telehealth Billing Engine:** Auto-suggests time-based CPT codes (CPT 99421: $15.52, CPT 99422: $31.04, CPT 99423: $46.56) and primary ICD-10 codes.
- **HL7 FHIR R4 Bundle:** Generates compliant JSON resource collection (`Patient`, `Encounter`, `Condition`) ready for Epic, Cerner, or AthenaHealth EHR integration.

![HL7 FHIR R4 Bundle Export](/docs/images/simulation/06_sim_fhir_tab.png)

---

## 🧪 Interactive Quick-Test Scenarios

The toolbar includes instant 1-click preset triggers:
- 🚨 **Acute Chest Pain (Cardiac):** ACS emergency intercept test.
- 🇪🇸 **Dolor Opresivo (Bilingual ES):** Spanish cardiovascular emergency test.
- 👶 **Neonatal Fever (<60 Days):** Pediatric sepsis/meningitis emergency screening.
- 🤕 **Tension Headache (Routine AI):** Benign triage flow.
- ✍️ **Custom Symptom Box:** Patients can type any custom symptom directly into the phone to test real-time pattern matching.

---

## 🎨 Theme & Accessibility
- **Dark Mode 🌙 / Light Mode ☀️:** Fully supported via single-click toggle with tailored WCAG-compliant color palettes.
- **Responsive Layout:** Automatically stacks on smaller mobile screens while expanding to split-screen on tablets and desktops.

![Light Mode Simulation](/docs/images/simulation/10_sim_light_theme.png)
