import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateEmergencyReflex,
  sanitizeClientPII,
  calculateJevRiskBand,
  getRiskBandTheme,
  generateSoapNote,
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
    });
  });
});
