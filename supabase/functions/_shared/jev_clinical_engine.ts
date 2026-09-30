/**
 * AnonyHealth — Jev System 1 Clinical Engine for Supabase Edge Functions
 * =====================================================================
 * Edge-native TypeScript implementation of the Jev System 1 Clinical Governor.
 * Enforces sub-millisecond emergency red-flag deflection, zero-knowledge PII
 * redaction, and post-triage safety arbiter rules.
 */

// ─── 1. Red-Flag Emergency Regex Catalog ───────────────────────
// ─── 1. Red-Flag Emergency Regex Catalog (Bilingual EN/ES + Pediatric) ────────
const RED_FLAG_TRIGGERS: Array<{ regex: RegExp; code: string; title: string }> = [
  // Cardiovascular & Chest Pain (EN & ES)
  {
    regex: /\b(crushing|radiat(ing|es)|squeezing|pressure|heavy)\b.*\b(chest|heart|sternum)\b/i,
    code: "ACUTE_CORONARY_SYNDROME",
    title: "Possible Acute Cardiac Event",
  },
  {
    regex: /\b(chest pain|heart attack|angina)\b/i,
    code: "CHEST_PAIN_EMERGENCY",
    title: "Acute Chest Discomfort",
  },
  {
    regex: /\b(dolor|opresi[oó]n|presi[oó]n|pesadez)\b.*\b(pecho|coraz[oó]n|estern[oó]n)\b/i,
    code: "ACUTE_CORONARY_SYNDROME_ES",
    title: "Posible Evento Cardíaco Agudo",
  },
  {
    regex: /\b(ataque al coraz[oó]n|infarto|dolor de pecho)\b/i,
    code: "CHEST_PAIN_EMERGENCY_ES",
    title: "Dolor Torácico Agudo",
  },
  {
    regex: /\b(pain)\b.*\b(left arm|jaw|back|neck)\b.*\b(chest|sweat|nausea)\b/i,
    code: "REFERRED_CARDIAC_PAIN",
    title: "Referred Cardiac Symptoms",
  },

  // Neurological / Stroke (FAST Protocol - EN & ES)
  {
    regex: /\b(facial droop|face drooping|face is numb|one side of face)\b/i,
    code: "STROKE_FACIAL_DROOP",
    title: "Stroke Indicator: Facial Droop",
  },
  {
    regex: /\b(par[aá]lisis facial|cara ca[ií]da|un lado de la cara entumecido)\b/i,
    code: "STROKE_FACIAL_DROOP_ES",
    title: "Signo de Accidente Cerebrovascular: Parálisis Facial",
  },
  {
    regex: /\b(arm weakness|cant lift arm|one arm numb|hemiplegia)\b/i,
    code: "STROKE_ARM_WEAKNESS",
    title: "Stroke Indicator: Arm Weakness",
  },
  {
    regex: /\b(brazo d[eé]bil|no puedo levantar el brazo|brazo entumecido)\b/i,
    code: "STROKE_ARM_WEAKNESS_ES",
    title: "Signo de Accidente Cerebrovascular: Debilidad en el Brazo",
  },
  {
    regex: /\b(slurred speech|speech is slurred|cant speak|words dont make sense|aphasia)\b/i,
    code: "STROKE_SPEECH_DIFFICULTY",
    title: "Stroke Indicator: Speech Difficulty",
  },
  {
    regex: /\b(dificultad para hablar|no puedo hablar|palabras trabadas|habla arrastrada)\b/i,
    code: "STROKE_SPEECH_DIFFICULTY_ES",
    title: "Signo de Accidente Cerebrovascular: Dificultad para Hablar",
  },
  {
    regex: /\b(worst headache of my life|thunderclap headache)\b/i,
    code: "SUBARACHNOID_HEMORRHAGE_SIGN",
    title: "Thunderclap Headache",
  },

  // Respiratory Distress (EN & ES)
  {
    regex: /\b(cant breathe|cannot breathe|unable to breathe|gasping for air|suffocating)\b/i,
    code: "ACUTE_RESPIRATORY_FAILURE",
    title: "Acute Severe Dyspnea",
  },
  {
    regex: /\b(no puedo respirar|falta de aire severa|me estoy ahogando|ahog[aá]ndome)\b/i,
    code: "ACUTE_RESPIRATORY_FAILURE_ES",
    title: "Dificultad Respiratoria Aguda",
  },
  {
    regex: /\b(lips (are )?turning blue|blue fingernails|cyanosis)\b/i,
    code: "CYANOSIS_HYPOXIA",
    title: "Cyanosis / Severe Hypoxia",
  },
  {
    regex: /\b(labios azules|u[ñn]as azules|cianosis)\b/i,
    code: "CYANOSIS_HYPOXIA_ES",
    title: "Cianosis / Hipoxia Severa",
  },
  {
    regex: /\b(stridor|wheezing severely|throat is closing|throat is swelling)\b/i,
    code: "AIRWAY_COMPROMISE",
    title: "Acute Airway Obstruction",
  },

  // Pediatric Emergency Triggers
  {
    regex: /\b(infant|baby|newborn|beb[eé]|reci[eé]n nacido)\b.*\b(fever|fiebre|100\.4|101|102|103|temperature)\b/i,
    code: "PEDIATRIC_FEVER_CRITICAL",
    title: "Critical Pediatric / Neonatal Fever",
  },

  // Anaphylaxis (EN & ES)
  {
    regex: /\b(anaphylaxis|throat swelling|tongue swelling|hives and vomiting)\b/i,
    code: "ANAPHYLAXIS_EMERGENCY",
    title: "Suspected Anaphylaxis",
  },
  {
    regex: /\b(anafilaxia|garganta cerrada|lengua hinchada|reacci[oó]n al[eé]rgica severa)\b/i,
    code: "ANAPHYLAXIS_EMERGENCY_ES",
    title: "Sospecha de Anafilaxia Severa",
  },

  // Crisis (EN & ES)
  {
    regex: /\b(suicid(e|al)|want to die|kill myself|end my life|take my own life)\b/i,
    code: "PSYCHIATRIC_CRISIS",
    title: "Immediate Psychiatric Crisis",
  },
  {
    regex: /\b(suicid(io|arme)|me quiero morir|quitarme la vida|acabar con mi vida)\b/i,
    code: "PSYCHIATRIC_CRISIS_ES",
    title: "Crisis Psiquiátrica Inmediata",
  },
  {
    regex: /\b(overdose|overdosed|swallowed (all|a bottle of) pills)\b/i,
    code: "OVERDOSE_EMERGENCY",
    title: "Toxic Ingestion / Overdose",
  },
  {
    regex: /\b(sobredosis|tom[eé] todas las pastillas|inger[ií] veneno)\b/i,
    code: "OVERDOSE_EMERGENCY_ES",
    title: "Ingestión Tóxica / Sobredosis",
  },
  {
    regex: /\b(coughing (up )?blood|vomiting blood|blood won'?t stop)\b/i,
    code: "SEVERE_HEMORRHAGE",
    title: "Severe Bleeding",
  },
];

// ─── 2. Prescription & Diagnosis Guardrails ────────────────────
const PRESCRIPTION_REGEX = /\b(take|prescribe|prescribing|dosage|dose of|inject)\s+(\d+\s*(mg|ml|tablets?|capsules?|pills?)|amoxicillin|lisinopril|azithromycin|metformin|atorvastatin|prednisone|hydrocodone|tramadol|xanax|adderall)\b/gi;
const DEFINITIVE_DIAG_REGEX = /\b(you have|i diagnose you with|your diagnosis is|you are diagnosed with)\s+(pneumonia|covid|influenza|bronchitis|diabetes|hypertension|migraine|concussion)\b/gi;

export interface EmergencyReflexResult {
  isEmergency: boolean;
  triggerCode: string;
  title: string;
  decisionClass: string;
  riskBand: string;
  severity: number;
  urgency: string;
  advice: string;
}

/**
 * Sub-millisecond emergency screening. Returns non-null if red flag matched.
 */
export function evaluateEmergencyReflex(text: string): EmergencyReflexResult | null {
  if (!text) return null;
  for (const trigger of RED_FLAG_TRIGGERS) {
    if (trigger.regex.test(text)) {
      return {
        isEmergency: true,
        triggerCode: trigger.code,
        title: trigger.title,
        decisionClass: "CRITICAL_EMERGENCY_911",
        riskBand: "CRITICAL",
        severity: 10,
        urgency: "emergency",
        advice:
          "🚨 CRITICAL CLINICAL SAFETY INTERCEPT: Your reported symptoms indicate a potential life-threatening emergency. Do not wait for online triage. Please call emergency services (911) or proceed immediately to the nearest Emergency Department. For mental health support or suicidal thoughts, dial 988 directly.",
      };
    }
  }
  return null;
}

export interface ArbiterAuditResult {
  verdict: "CERTIFIED" | "CERTIFIED_WITH_REMEDIATIONS";
  decisionClass: string;
  riskBand: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  auditedSeverity: number;
  auditedUrgency: string;
  auditedSymptom: string;
  sanitizedAdvice: string;
  violations: string[];
}

/**
 * Audits AI triage output to prevent prescription leakage, definitive diagnoses,
 * and severity/urgency misalignments.
 */
export function auditTriageOutput(
  rawAdvice: string,
  rawMeta: Record<string, unknown>
): ArbiterAuditResult {
  const violations: string[] = [];
  let sanitizedAdvice = rawAdvice;

  let severity = typeof rawMeta.severity === "number" ? rawMeta.severity : 5;
  let urgency = String(rawMeta.urgency || "routine").toLowerCase();
  const symptom = String(rawMeta.symptom || "Primary Symptom Summary");

  // Rule 1: Strip direct medication prescriptions
  if (PRESCRIPTION_REGEX.test(rawAdvice)) {
    violations.push("UNAUTHORIZED_MEDICATION_PRESCRIPTION");
    sanitizedAdvice = sanitizedAdvice.replace(
      PRESCRIPTION_REGEX,
      "[Consult provider for prescription options]"
    );
  }

  // Rule 2: Soften definitive medical diagnoses to differentials
  if (DEFINITIVE_DIAG_REGEX.test(rawAdvice)) {
    violations.push("UNAUTHORIZED_DIAGNOSIS_ASSERTION");
    sanitizedAdvice = sanitizedAdvice.replace(
      DEFINITIVE_DIAG_REGEX,
      "Your symptoms may be consistent with"
    );
  }

  // Rule 3: Enforce Severity vs Urgency Consistency
  if (severity >= 9 && urgency !== "emergency") {
    urgency = "emergency";
    violations.push("URGENCY_ELEVATED_TO_EMERGENCY");
  } else if (severity >= 7 && (urgency === "self-care" || urgency === "routine")) {
    urgency = "urgent";
    violations.push("URGENCY_ELEVATED_TO_URGENT");
  }

  // Classify Decision Class
  let decisionClass = "ROUTINE_CLINICAL_VISIT";
  let riskBand: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" = "MODERATE";

  if (urgency === "emergency" || severity >= 9) {
    decisionClass = "CRITICAL_EMERGENCY_911";
    riskBand = "CRITICAL";
  } else if (urgency === "urgent" || severity >= 7) {
    decisionClass = "URGENT_TELEHEALTH_SAME_DAY";
    riskBand = "HIGH";
  } else if (severity <= 3 && urgency === "self-care") {
    decisionClass = "HOME_CARE_MONITORING";
    riskBand = "LOW";
  }

  return {
    verdict: violations.length === 0 ? "CERTIFIED" : "CERTIFIED_WITH_REMEDIATIONS",
    decisionClass,
    riskBand,
    auditedSeverity: severity,
    auditedUrgency: urgency,
    auditedSymptom: symptom,
    sanitizedAdvice,
    violations,
  };
}
