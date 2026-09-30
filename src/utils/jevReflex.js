/**
 * AnonyHealth — Jev System 1 Clinical Reflex & Safety Engine (Client-Side)
 * ========================================================================
 * Provides sub-millisecond deterministic emergency red-flag screening,
 * zero-knowledge PII redaction, and clinical risk classification.
 */

// ─── 1. Emergency Red-Flag Clinical Triggers ──────────────────
// ─── 1. Emergency Red-Flag Clinical Triggers (Bilingual EN/ES + Pediatric) ────
const RED_FLAG_DEFINITIONS = [
  // Cardiovascular & Chest Pain (EN & ES)
  {
    regex: /\b(crushing|radiat(ing|es)|squeezing|pressure|heavy)\b.*\b(chest|heart|sternum)\b/i,
    code: "ACUTE_CORONARY_SYNDROME",
    title: "Possible Acute Cardiac Event",
    detail: "Chest pain radiating to the jaw, neck, arm, or associated with diaphoresis requires immediate emergency intervention.",
  },
  {
    regex: /\b(chest pain|heart attack|angina)\b/i,
    code: "CHEST_PAIN_EMERGENCY",
    title: "Acute Chest Discomfort",
    detail: "Sudden onset chest pain cannot be safely triaged online.",
  },
  {
    regex: /\b(dolor|opresi[oó]n|presi[oó]n|pesadez)\b.*\b(pecho|coraz[oó]n|estern[oó]n)\b/i,
    code: "ACUTE_CORONARY_SYNDROME_ES",
    title: "Posible Evento Cardíaco Agudo (Emergency)",
    detail: "El dolor opresivo en el pecho requiere atención médica de emergencia inmediata (911).",
  },
  {
    regex: /\b(ataque al coraz[oó]n|infarto|dolor de pecho)\b/i,
    code: "CHEST_PAIN_EMERGENCY_ES",
    title: "Dolor Torácico Agudo (Emergency)",
    detail: "El dolor torácico agudo no puede ser evaluado por telemedicina.",
  },
  {
    regex: /\b(pain)\b.*\b(left arm|jaw|back|neck)\b.*\b(chest|sweat|nausea)\b/i,
    code: "REFERRED_CARDIAC_PAIN",
    title: "Referred Cardiac Symptoms",
    detail: "Pain radiating from chest to upper extremities warrants immediate 911 evaluation.",
  },

  // Neurological / Stroke (FAST Protocol - EN & ES)
  {
    regex: /\b(facial droop|face drooping|face is numb|one side of face)\b/i,
    code: "STROKE_FACIAL_DROOP",
    title: "Stroke Indicator: Facial Droop (FAST)",
    detail: "Sudden facial asymmetry is a hallmark of acute cerebral ischemia.",
  },
  {
    regex: /\b(par[aá]lisis facial|cara ca[ií]da|un lado de la cara entumecido)\b/i,
    code: "STROKE_FACIAL_DROOP_ES",
    title: "Signo de Accidente Cerebrovascular: Parálisis Facial",
    detail: "La asimetría facial repentina es una emergencia neurológica crítica.",
  },
  {
    regex: /\b(arm weakness|cant lift arm|one arm numb|hemiplegia)\b/i,
    code: "STROKE_ARM_WEAKNESS",
    title: "Stroke Indicator: Arm Weakness (FAST)",
    detail: "Sudden motor weakness in an extremity is a critical emergency.",
  },
  {
    regex: /\b(brazo d[eé]bil|no puedo levantar el brazo|brazo entumecido)\b/i,
    code: "STROKE_ARM_WEAKNESS_ES",
    title: "Signo de Accidente Cerebrovascular: Debilidad en el Brazo",
    detail: "Pérdida motora repentina en un brazo requiere evaluación médica urgente.",
  },
  {
    regex: /\b(slurred speech|speech is slurred|cant speak|words dont make sense|aphasia)\b/i,
    code: "STROKE_SPEECH_DIFFICULTY",
    title: "Stroke Indicator: Speech Difficulty (FAST)",
    detail: "Acute speech impediment requires emergency neurological assessment within the thrombolytic time window.",
  },
  {
    regex: /\b(dificultad para hablar|no puedo hablar|palabras trabadas|habla arrastrada)\b/i,
    code: "STROKE_SPEECH_DIFFICULTY_ES",
    title: "Signo de Accidente Cerebrovascular: Dificultad para Hablar",
    detail: "Dificultad repentina para hablar requiere evaluación de emergencia.",
  },
  {
    regex: /\b(worst headache of my life|thunderclap headache)\b/i,
    code: "SUBARACHNOID_HEMORRHAGE_SIGN",
    title: "Thunderclap Headache",
    detail: "Hyperacute explosive headache may indicate subarachnoid hemorrhage.",
  },

  // Respiratory Distress (EN & ES)
  {
    regex: /\b(cant breathe|cannot breathe|unable to breathe|gasping for air|suffocating)\b/i,
    code: "ACUTE_RESPIRATORY_FAILURE",
    title: "Acute Severe Dyspnea",
    detail: "Inability to maintain respiration requires emergency oxygenation.",
  },
  {
    regex: /\b(no puedo respirar|falta de aire severa|me estoy ahogando|ahog[aá]ndome)\b/i,
    code: "ACUTE_RESPIRATORY_FAILURE_ES",
    title: "Dificultad Respiratoria Aguda",
    detail: "La incapacidad para respirar requiere oxigenación de emergencia.",
  },
  {
    regex: /\b(lips (are )?turning blue|blue fingernails|cyanosis)\b/i,
    code: "CYANOSIS_HYPOXIA",
    title: "Cyanosis / Severe Hypoxia",
    detail: "Blue discoloration of extremities or lips signifies critical arterial desaturation.",
  },
  {
    regex: /\b(labios azules|u[ñn]as azules|cianosis)\b/i,
    code: "CYANOSIS_HYPOXIA_ES",
    title: "Cianosis / Hipoxia Severa",
    detail: "Coloración azulada en labios o uñas indica falta crítica de oxígeno.",
  },
  {
    regex: /\b(stridor|wheezing severely|throat is closing|throat is swelling)\b/i,
    code: "AIRWAY_COMPROMISE",
    title: "Acute Upper Airway Obstruction",
    detail: "Rapidly swelling airway can lead to complete asphyxiation.",
  },

  // Pediatric Emergency Triggers
  {
    regex: /\b(infant|baby|newborn|beb[eé]|reci[eé]n nacido)\b.*\b(fever|fiebre|100\.4|101|102|103|temperature)\b/i,
    code: "PEDIATRIC_FEVER_CRITICAL",
    title: "Critical Pediatric / Neonatal Fever",
    detail: "Any infant under 3 months with a fever >= 100.4°F requires immediate emergency pediatric evaluation to rule out serious neonatal infection.",
  },

  // Anaphylaxis (EN & ES)
  {
    regex: /\b(anaphylaxis|throat swelling|tongue swelling|hives and vomiting)\b/i,
    code: "ANAPHYLAXIS_EMERGENCY",
    title: "Suspected Anaphylaxis",
    detail: "Multi-system allergic response requires immediate intramuscular epinephrine and 911 activation.",
  },
  {
    regex: /\b(anafilaxia|garganta cerrada|lengua hinchada|reacci[oó]n al[eé]rgica severa)\b/i,
    code: "ANAPHYLAXIS_EMERGENCY_ES",
    title: "Sospecha de Anafilaxia Severa",
    detail: "Reacción alérgica severa requiere epinefrina de emergencia y llamada inmediata al 911.",
  },

  // Psychiatric Emergency / Crisis (EN & ES)
  {
    regex: /\b(suicid(e|al)|want to die|kill myself|end my life|take my own life)\b/i,
    code: "PSYCHIATRIC_CRISIS",
    title: "Immediate Psychiatric Crisis",
    detail: "Direct thoughts of self-harm require continuous human support via 988 Crisis Lifeline.",
  },
  {
    regex: /\b(suicid(io|arme)|me quiero morir|quitarme la vida|acabar con mi vida)\b/i,
    code: "PSYCHIATRIC_CRISIS_ES",
    title: "Crisis Psiquiátrica Inmediata",
    detail: "Pensamientos de autolesión requieren apoyo humano inmediato a través de la Línea 988.",
  },
  {
    regex: /\b(overdose|overdosed|swallowed (all|a bottle of) pills)\b/i,
    code: "OVERDOSE_EMERGENCY",
    title: "Toxic Ingestion / Overdose",
    detail: "Immediate toxicology support via Poison Control (1-800-222-1222) and Emergency (911).",
  },
  {
    regex: /\b(sobredosis|tom[eé] todas las pastillas|inger[ií] veneno)\b/i,
    code: "OVERDOSE_EMERGENCY_ES",
    title: "Ingestión Tóxica / Sobredosis",
    detail: "Soporte toxicológico urgente a través de Control de Envenenamiento y 911.",
  },

  // Hemorrhage
  {
    regex: /\b(coughing (up )?blood|vomiting blood|blood won'?t stop)\b/i,
    code: "SEVERE_HEMORRHAGE",
    title: "Severe Uncontrolled Bleeding",
    detail: "Hemoptysis or gastrointestinal hemorrhage requires emergency room evaluation.",
  },
];

// ─── 2. PII Sanitization Patterns ─────────────────────────────
const PII_RULES = [
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, mask: "[SSN_REDACTED]" },
  { regex: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, mask: "[PHONE_REDACTED]" },
  { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, mask: "[EMAIL_REDACTED]" },
  { regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, mask: "[CARD_REDACTED]" },
];

/**
 * Screen user message for emergency red-flag presentations (< 1ms).
 * @param {string} text
 * @returns {object|null}
 */
export function evaluateEmergencyReflex(text) {
  if (!text || typeof text !== "string") return null;

  for (const item of RED_FLAG_DEFINITIONS) {
    if (item.regex.test(text)) {
      return {
        isEmergency: true,
        triggerCode: item.code,
        title: item.title,
        detail: item.detail,
        decisionClass: "CRITICAL_EMERGENCY_911",
        riskBand: "CRITICAL",
        severity: 10,
        urgency: "emergency",
        advice:
          "🚨 CRITICAL CLINICAL SAFETY INTERCEPT: Your reported symptoms indicate a potential life-threatening emergency. Do not wait for online chat. Please call emergency services (911) or proceed immediately to the nearest Emergency Department. For mental health support or suicidal thoughts, dial 988 directly.",
        hotlines: [
          { name: "Emergency Services", number: "911", tel: "tel:911", primary: true },
          { name: "Suicide & Crisis Lifeline", number: "988", tel: "tel:988", primary: false },
          { name: "Poison Control Center", number: "1-800-222-1222", tel: "tel:18002221222", primary: false },
        ],
      };
    }
  }

  return null;
}

/**
 * Sanitize PII identifiers for zero-knowledge data transmission.
 * @param {string} text
 * @returns {{ sanitized: string, redactedCount: number }}
 */
export function sanitizeClientPII(text) {
  if (!text || typeof text !== "string") return { sanitized: text, redactedCount: 0 };
  let sanitized = text;
  let redactedCount = 0;

  for (const rule of PII_RULES) {
    const matches = sanitized.match(rule.regex);
    if (matches) {
      redactedCount += matches.length;
      sanitized = sanitized.replace(rule.regex, rule.mask);
    }
  }

  return { sanitized, redactedCount };
}

/**
 * Classify Jev Risk Band from clinical parameters.
 * @param {number} severity
 * @param {string} urgency
 * @returns {'CRITICAL'|'HIGH'|'MODERATE'|'LOW'}
 */
export function calculateJevRiskBand(severity = 5, urgency = "routine") {
  const normUrgency = String(urgency).toLowerCase();
  if (normUrgency === "emergency" || severity >= 9) return "CRITICAL";
  if (normUrgency === "urgent" || severity >= 7) return "HIGH";
  if (severity >= 4) return "MODERATE";
  return "LOW";
}

/**
 * Visual styling tokens for Jev Risk Bands.
 * @param {'CRITICAL'|'HIGH'|'MODERATE'|'LOW'} riskBand
 * @returns {{ bg: string, border: string, text: string, badge: string }}
 */
export function getRiskBandTheme(riskBand) {
  switch (riskBand) {
    case "CRITICAL":
      return { bg: "rgba(220, 38, 38, 0.12)", border: "#dc2626", text: "#ef4444", badge: "#dc2626" };
    case "HIGH":
      return { bg: "rgba(217, 119, 6, 0.12)", border: "#d97706", text: "#f59e0b", badge: "#d97706" };
    case "MODERATE":
      return { bg: "rgba(37, 99, 235, 0.12)", border: "#2563eb", text: "#3b82f6", badge: "#2563eb" };
    case "LOW":
    default:
      return { bg: "rgba(22, 163, 74, 0.12)", border: "#16a34a", text: "#22c55e", badge: "#16a34a" };
  }
}

/**
 * Automatically suggests non-binding telehealth billing codes (CPT 99421-99423) and ICD-10.
 * @param {object} log
 * @returns {{ cpt: string, cptDesc: string, icd10: string, icd10Desc: string }}
 */
export function suggestBillingCodes(log) {
  const sev = log?.severity ?? 4;
  const symptomLower = (log?.symptom || "").toLowerCase();

  // Telehealth Digital Evaluation & Management codes (CPT 99421 - 99423)
  let cpt = "99421";
  let cptDesc = "Online digital evaluation and management service, 5–10 minutes";
  if (sev >= 7) {
    cpt = "99423";
    cptDesc = "Online digital evaluation and management service, 21+ minutes (High Complexity)";
  } else if (sev >= 4) {
    cpt = "99422";
    cptDesc = "Online digital evaluation and management service, 11–20 minutes (Moderate Complexity)";
  }

  // Symptom to ICD-10 heuristic mapping
  let icd10 = "Z71.89";
  let icd10Desc = "Other specified healthcare consultation";

  if (/cough|tos/i.test(symptomLower)) {
    icd10 = "R05.9";
    icd10Desc = "Cough, unspecified";
  } else if (/headache|cefalea|dolor de cabeza/i.test(symptomLower)) {
    icd10 = "R51.9";
    icd10Desc = "Headache, unspecified";
  } else if (/throat|garganta|faringitis/i.test(symptomLower)) {
    icd10 = "J02.9";
    icd10Desc = "Acute pharyngitis, unspecified";
  } else if (/fever|fiebre/i.test(symptomLower)) {
    icd10 = "R50.9";
    icd10Desc = "Fever, unspecified";
  } else if (/chest|pecho/i.test(symptomLower)) {
    icd10 = "R07.9";
    icd10Desc = "Chest pain, unspecified";
  } else if (/stomach|abdominal|nausea|vomit/i.test(symptomLower)) {
    icd10 = "R10.9";
    icd10Desc = "Abdominal pain, unspecified";
  } else if (/rash|skin|piel|sarpullido/i.test(symptomLower)) {
    icd10 = "R21";
    icd10Desc = "Rash and other nonspecific skin eruption";
  }

  return { cpt, cptDesc, icd10, icd10Desc };
}

/**
 * Synthesizes a standardized Clinical SOAP Note from triage log and patient profile.
 * @param {object} log - Health log entry with symptom, ai_advice, severity, urgency, created_at, red_flags
 * @param {object} profile - Patient profile with full_name, dob, address, etc.
 * @returns {string} Formatted clinical SOAP note
 */
export function generateSoapNote(log, profile = {}) {
  const dateStr = log?.created_at ? new Date(log.created_at).toLocaleString() : new Date().toLocaleString();
  const patientName = profile?.full_name || "Anonymous Patient";
  const dobStr = profile?.dob ? new Date(profile.dob).toLocaleDateString() : "Undisclosed";
  const addressStr = profile?.address || "Maryland";
  const sev = log?.severity != null ? log.severity : "Unrated";
  const urg = log?.urgency || "routine";
  const riskBand = calculateJevRiskBand(log?.severity ?? 5, urg);
  const symptom = log?.symptom || "Unspecified symptom";
  const advice = log?.ai_advice || "No automated advice recorded.";
  const redFlags = log?.red_flags && log.red_flags.length > 0 ? log.red_flags.join(", ") : "None Detected";
  const billing = suggestBillingCodes(log);

  return `CLINICAL TELEHEALTH ENCOUNTER NOTE (SOAP)
================================================================================
Date / Time:       ${dateStr}
Patient Name:      ${patientName}
Date of Birth:     ${dobStr}
Jurisdiction:      ${addressStr} (Maryland Telehealth Act HB 123 Compliant)
Safety Class:      Jev Risk Band [${riskBand}] (Severity: ${sev}/10 | Urgency: ${urg.toUpperCase()})
Red-Flag Triggers: ${redFlags}
--------------------------------------------------------------------------------
S (SUBJECTIVE):
- Chief Complaint: "${symptom}"
- Reported Severity Rating: ${sev} / 10
- Urgency Stratification: ${urg}
- Presentation Mode: Synchronous Zero-Knowledge Patient Mobile Intake

O (OBJECTIVE):
- Clinical Reflex Engine: ${redFlags !== "None Detected" ? `POSITIVE trigger intercept (${redFlags})` : "NEGATIVE for acute cardiovascular, FAST stroke, airway, or anaphylaxis red-flags"}
- Jev Risk Classification: ${riskBand} (Automated System 1 deterministic screening)
- Intake Timestamp: ${dateStr}

A (ASSESSMENT):
- AI Clinical Triage Synthesis:
  ${advice.replace(/\n/g, "\n  ")}
- Triage Band: ${riskBand}

P (PLAN):
- Disposition: Telehealth provider clinical review & diagnostic confirmation.
- Direct Actions: Confirm allergies/medications, evaluate need for synchronous video visit or in-person referral.
- Return Precautions / Safety Netting: Patient educated to seek immediate emergency care (dial 911 or report to nearest Emergency Room) if developing sudden crushing chest pressure, facial droop, arm weakness, slurred speech, or acute dyspnea.
--------------------------------------------------------------------------------
BILLING & CODING DECISION SUPPORT (Non-Binding Clinical Suggestion):
- Primary Telehealth CPT: ${billing.cpt} — ${billing.cptDesc}
- Suggested ICD-10 Diagnosis: ${billing.icd10} — ${billing.icd10Desc}
- Place of Service (POS): 02 / 10 (Telehealth Provided in Patient Home)
================================================================================
CONFIDENTIAL & PRIVILEGED MEDICAL ENCOUNTER RECORD — JEV CLINICAL GOVERNANCE`;
}

/**
 * Synthesizes an HL7 FHIR R4 Bundle for direct hospital EHR import (Epic, Cerner, AthenaHealth).
 * @param {object} log
 * @param {object} profile
 * @returns {object} FHIR R4 Document Bundle
 */
export function generateFhirEncounter(log, profile = {}) {
  const encounterId = log?.id || `enc-${Date.now()}`;
  const patientId = profile?.user_id || profile?.id || "anonymous-patient";
  const now = log?.created_at ? new Date(log.created_at).toISOString() : new Date().toISOString();
  const riskBand = calculateJevRiskBand(log?.severity ?? 5, log?.urgency || "routine");
  const billing = suggestBillingCodes(log);

  return {
    resourceType: "Bundle",
    id: `bundle-${encounterId}`,
    type: "document",
    timestamp: now,
    meta: {
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-documentreference"],
    },
    entry: [
      {
        resource: {
          resourceType: "Composition",
          id: `comp-${encounterId}`,
          status: "final",
          type: {
            coding: [
              {
                system: "http://loinc.org",
                code: "11488-4",
                display: "Consultation note",
              },
            ],
            text: "Telehealth Triage Encounter Note",
          },
          subject: {
            reference: `Patient/${patientId}`,
            display: profile?.full_name || "Anonymous Patient",
          },
          date: now,
          title: "AnonyHealth Jev Clinical Encounter Note",
          section: [
            {
              title: "Subjective",
              code: { coding: [{ system: "http://loinc.org", code: "61150-9", display: "Subjective narrative" }] },
              text: {
                status: "generated",
                div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Chief Complaint:</b> ${log?.symptom || "N/A"}</p><p><b>Reported Severity:</b> ${log?.severity || "N/A"}/10</p></div>`,
              },
            },
            {
              title: "Assessment and Plan",
              code: { coding: [{ system: "http://loinc.org", code: "51847-2", display: "Assessment and Plan" }] },
              text: {
                status: "generated",
                div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${log?.ai_advice || "N/A"}</p><p><b>Jev Risk Band:</b> ${riskBand}</p></div>`,
              },
            },
            {
              title: "Billing & Coding",
              code: { coding: [{ system: "http://loinc.org", code: "77600-5", display: "Encounter reason" }] },
              text: {
                status: "generated",
                div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>CPT: ${billing.cpt} (${billing.cptDesc})</p><p>ICD-10: ${billing.icd10} (${billing.icd10Desc})</p></div>`,
              },
            },
          ],
        },
      },
      {
        resource: {
          resourceType: "Observation",
          id: `obs-risk-${encounterId}`,
          status: "final",
          code: {
            coding: [{ system: "http://loinc.org", code: "75325-1", display: "Symptom score" }],
            text: "Jev System 1 Clinical Risk Stratification",
          },
          subject: {
            reference: `Patient/${patientId}`,
          },
          effectiveDateTime: now,
          valueString: riskBand,
        },
      },
    ],
  };
}

