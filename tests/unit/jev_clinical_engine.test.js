import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateEmergencyReflex,
  sanitizeClientPII,
  calculateJevRiskBand,
  getRiskBandTheme,
  generateSoapNote,
  suggestBillingCodes,
  generateFhirEncounter,
} from "../../src/utils/jevReflex.js";

describe("Jev System 1 Clinical Safety Engine", () => {
  describe("Emergency Red-Flag Reflex Screening", () => {
    it("intercepts acute coronary syndrome (crushing chest pain)", () => {
      const result = evaluateEmergencyReflex("I have a crushing pressure in my chest and heart");
      assert.ok(result, "Expected emergency interception");
      assert.strictEqual(result.isEmergency, true);
      assert.strictEqual(result.triggerCode, "ACUTE_CORONARY_SYNDROME");
      assert.strictEqual(result.riskBand, "CRITICAL");
      assert.strictEqual(result.decisionClass, "CRITICAL_EMERGENCY_911");
    });

    it("intercepts stroke FAST protocol (facial droop)", () => {
      const result = evaluateEmergencyReflex("My mother has sudden facial droop and cant smile");
      assert.ok(result);
      assert.strictEqual(result.triggerCode, "STROKE_FACIAL_DROOP");
      assert.strictEqual(result.riskBand, "CRITICAL");
    });

    it("intercepts stroke FAST protocol (slurred speech)", () => {
      const result = evaluateEmergencyReflex("My speech is slurred and words dont make sense");
      assert.ok(result);
      assert.strictEqual(result.triggerCode, "STROKE_SPEECH_DIFFICULTY");
    });

    it("intercepts acute respiratory failure (cannot breathe)", () => {
      const result = evaluateEmergencyReflex("I cannot breathe and my chest feels tight");
      assert.ok(result);
      assert.strictEqual(result.triggerCode, "ACUTE_RESPIRATORY_FAILURE");
    });

    it("intercepts psychiatric crisis and provides 988 hotline", () => {
      const result = evaluateEmergencyReflex("I want to die and end my life");
      assert.ok(result);
      assert.strictEqual(result.triggerCode, "PSYCHIATRIC_CRISIS");
      const has988 = result.hotlines.some((h) => h.number === "988");
      assert.ok(has988, "Expected 988 Suicide & Crisis Lifeline in hotlines");
    });

    it("allows non-emergency clinical queries to proceed through to System 2", () => {
      const benignSymptoms = [
        "Mild headache after staring at computer screen for 8 hours",
        "Slight runny nose and sneezing for 2 days",
        "Dry skin on elbow and mild redness",
        "Muscle soreness after running 5 miles yesterday",
      ];
      for (const query of benignSymptoms) {
        const result = evaluateEmergencyReflex(query);
        assert.strictEqual(result, null, `Query "${query}" should not be flagged as emergency`);
      }
    });
  });

  describe("Zero-Knowledge PII Sanitization", () => {
    it("redacts SSN, phone number, email, and card numbers", () => {
      const raw = "My SSN is 123-45-6789, phone is 410-555-0199, email is patient@testmed.org, card 4111-2222-3333-4444";
      const { sanitized, redactedCount } = sanitizeClientPII(raw);
      assert.strictEqual(redactedCount, 4);
      assert.ok(!sanitized.includes("123-45-6789"));
      assert.ok(sanitized.includes("[SSN_REDACTED]"));
      assert.ok(!sanitized.includes("410-555-0199"));
      assert.ok(sanitized.includes("[PHONE_REDACTED]"));
      assert.ok(!sanitized.includes("patient@testmed.org"));
      assert.ok(sanitized.includes("[EMAIL_REDACTED]"));
      assert.ok(!sanitized.includes("4111-2222-3333-4444"));
      assert.ok(sanitized.includes("[CARD_REDACTED]"));
    });

    it("leaves safe symptom descriptions untouched", () => {
      const safe = "Throat tickle and mild dry cough for two days";
      const { sanitized, redactedCount } = sanitizeClientPII(safe);
      assert.strictEqual(redactedCount, 0);
      assert.strictEqual(sanitized, safe);
    });
  });

  describe("Jev Risk Band Stratification", () => {
    it("stratifies emergency urgency or severity >= 9 as CRITICAL", () => {
      assert.strictEqual(calculateJevRiskBand(10, "routine"), "CRITICAL");
      assert.strictEqual(calculateJevRiskBand(5, "emergency"), "CRITICAL");
    });

    it("stratifies urgent urgency or severity 7-8 as HIGH", () => {
      assert.strictEqual(calculateJevRiskBand(8, "routine"), "HIGH");
      assert.strictEqual(calculateJevRiskBand(4, "urgent"), "HIGH");
    });

    it("stratifies severity 4-6 as MODERATE", () => {
      assert.strictEqual(calculateJevRiskBand(5, "routine"), "MODERATE");
      assert.strictEqual(calculateJevRiskBand(4, "routine"), "MODERATE");
    });

    it("stratifies severity 1-3 as LOW", () => {
      assert.strictEqual(calculateJevRiskBand(2, "routine"), "LOW");
    });

    it("provides cohesive risk styling tokens", () => {
      const criticalTheme = getRiskBandTheme("CRITICAL");
      assert.ok(criticalTheme.badge);
      assert.ok(criticalTheme.border);
      const lowTheme = getRiskBandTheme("LOW");
      assert.ok(lowTheme.badge);
    });
  });

  describe("Clinical SOAP Note Generation", () => {
    it("synthesizes structured SOAP note with Maryland HB 123 compliance header", () => {
      const log = {
        id: "log-123",
        created_at: "2026-09-30T16:00:00Z",
        symptom: "Persistent dry cough and mild fever 99.8F",
        severity: 4,
        urgency: "routine",
        ai_advice: "Rest, hydrate, monitor temperature. Consult primary clinician if fever exceeds 101F.",
        red_flags: [],
      };
      const profile = {
        full_name: "Jane Doe",
        dob: "1988-04-12",
        address: "Baltimore, MD",
      };

      const note = generateSoapNote(log, profile);
      assert.ok(note.includes("CLINICAL TELEHEALTH ENCOUNTER NOTE (SOAP)"));
      assert.ok(note.includes("Jane Doe"));
      assert.ok(note.includes("Maryland Telehealth Act HB 123 Compliant"));
      assert.ok(note.includes("S (SUBJECTIVE):"));
      assert.ok(note.includes("Persistent dry cough"));
      assert.ok(note.includes("O (OBJECTIVE):"));
      assert.ok(note.includes("NEGATIVE for acute cardiovascular"));
      assert.ok(note.includes("A (ASSESSMENT):"));
      assert.ok(note.includes("P (PLAN):"));
      assert.ok(note.includes("Return Precautions / Safety Netting"));
      assert.ok(note.includes("BILLING & CODING DECISION SUPPORT"));
      assert.ok(note.includes("CPT: 99422"));
      assert.ok(note.includes("R05.9"));
    });
  });

  describe("Bilingual Spanish & Pediatric Safety Triggers", () => {
    it("intercepts Spanish cardiac presentation (dolor opresivo en el pecho)", () => {
      const result = evaluateEmergencyReflex("Tengo un dolor y opresión muy fuerte en el pecho");
      assert.ok(result);
      assert.strictEqual(result.triggerCode, "ACUTE_CORONARY_SYNDROME_ES");
      assert.strictEqual(result.riskBand, "CRITICAL");
    });

    it("intercepts Spanish stroke FAST trigger (parálisis facial y habla trabada)", () => {
      const result = evaluateEmergencyReflex("Mi padre tiene parálisis facial repentina");
      assert.ok(result);
      assert.strictEqual(result.triggerCode, "STROKE_FACIAL_DROOP_ES");
    });

    it("intercepts Spanish respiratory crisis (no puedo respirar)", () => {
      const result = evaluateEmergencyReflex("Ayuda, no puedo respirar bien");
      assert.ok(result);
      assert.strictEqual(result.triggerCode, "ACUTE_RESPIRATORY_FAILURE_ES");
    });

    it("intercepts Spanish suicidal crisis (me quiero morir)", () => {
      const result = evaluateEmergencyReflex("Ya no aguanto más y me quiero morir");
      assert.ok(result);
      assert.strictEqual(result.triggerCode, "PSYCHIATRIC_CRISIS_ES");
    });

    it("intercepts pediatric infant fever trigger (infant with fever 101F)", () => {
      const result = evaluateEmergencyReflex("My 6-week old baby has a fever of 101F");
      assert.ok(result);
      assert.strictEqual(result.triggerCode, "PEDIATRIC_FEVER_CRITICAL");
      assert.strictEqual(result.riskBand, "CRITICAL");
    });
  });

  describe("Telehealth Billing Assist & FHIR R4 Bundle Export", () => {
    it("suggests CPT 99423 and high complexity for severity >= 7", () => {
      const log = { severity: 8, symptom: "Severe migraine headache" };
      const billing = suggestBillingCodes(log);
      assert.strictEqual(billing.cpt, "99423");
      assert.strictEqual(billing.icd10, "R51.9");
    });

    it("synthesizes valid HL7 FHIR R4 document bundle", () => {
      const log = {
        id: "log-789",
        symptom: "Severe throat pain and swallowing difficulty",
        severity: 7,
        urgency: "urgent",
        ai_advice: "Possible streptococcal pharyngitis. In-person clinical culture advised.",
        created_at: "2026-09-30T17:00:00Z",
      };
      const profile = {
        user_id: "usr-456",
        full_name: "Carlos Santana",
      };

      const bundle = generateFhirEncounter(log, profile);
      assert.strictEqual(bundle.resourceType, "Bundle");
      assert.strictEqual(bundle.type, "document");
      assert.strictEqual(bundle.entry.length, 2);

      const composition = bundle.entry[0].resource;
      assert.strictEqual(composition.resourceType, "Composition");
      assert.strictEqual(composition.status, "final");
      assert.strictEqual(composition.subject.display, "Carlos Santana");

      const observation = bundle.entry[1].resource;
      assert.strictEqual(observation.resourceType, "Observation");
      assert.strictEqual(observation.valueString, "HIGH");
    });
  });
});
