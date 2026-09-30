#!/usr/bin/env python3
"""
AnonyHealth — Jev System 1 Clinical Safety & Reflex Engine
==========================================================
Deterministic, sub-1ms clinical safety guardrails, red-flag emergency
intercepts, zero-knowledge PII striping, and output verification.

Usage:
  python3 scripts/jev_clinical_engine.py --test
"""

import re
import time
import json
import hashlib
from typing import Dict, Any, List, Tuple, Optional

# ==============================================================================
# 1. System 1 Deterministic Emergency Red-Flag Taxonomy
# ==============================================================================

RED_FLAG_PATTERNS = [
    # Cardiovascular & Chest Pain
    (r"\b(crushing|radiat(ing|es)|squeezing|pressure|heavy)\b.*\b(chest|heart|sternum)\b", "ACUTE_CORONARY_SYNDROME"),
    (r"\b(chest pain|heart attack|angina)\b", "CHEST_PAIN_EMERGENCY"),
    (r"\b(pain)\b.*\b(left arm|jaw|back|neck)\b.*\b(chest|sweat|nausea)\b", "REFERRED_CARDIAC_PAIN"),
    
    # Neurological / Stroke (FAST Protocol)
    (r"\b(facial droop|face drooping|face is numb)\b", "STROKE_FACIAL_DROOP"),
    (r"\b(arm weakness|cant lift arm|one arm numb|hemiplegia)\b", "STROKE_ARM_WEAKNESS"),
    (r"\b(slurred speech|speech is slurred|cant speak|words dont make sense|aphasia)\b", "STROKE_SPEECH_DIFFICULTY"),
    (r"\b(worst headache of my life|thunderclap headache)\b", "SUBARACHNOID_HEMORRHAGE_SIGN"),
    
    # Respiratory Distress
    (r"\b(cant breathe|cannot breathe|unable to breathe|gasping for air|suffocating)\b", "ACUTE_RESPIRATORY_FAILURE"),
    (r"\b(lips (are )?turning blue|blue fingernails|cyanosis)\b", "CYANOSIS_HYPOXIA"),
    (r"\b(stridor|wheezing severely|throat is closing|throat is swelling)\b", "AIRWAY_COMPROMISE"),
    
    # Anaphylaxis
    (r"\b(anaphylaxis|throat swelling|tongue swelling|hives and vomiting)\b", "ANAPHYLAXIS_EMERGENCY"),
    
    # Psychiatric / Crisis
    (r"\b(suicid(e|al)|want to die|kill myself|end my life|take my own life)\b", "PSYCHIATRIC_CRISIS"),
    (r"\b(overdose|overdosed|swallowed (all|a bottle of) pills)\b", "OVERDOSE_EMERGENCY"),
    
    # Severe Bleeding / Trauma
    (r"\b(coughing (up )?blood|vomiting blood|blood won'?t stop)\b", "SEVERE_HEMORRHAGE"),
]

COMPILED_RED_FLAGS = [(re.compile(pat, re.IGNORECASE), code) for pat, code in RED_FLAG_PATTERNS]

# ==============================================================================
# 2. PII Redaction Patterns (Zero-Knowledge Ingress)
# ==============================================================================

PII_PATTERNS = [
    # SSN
    (r"\b\d{3}-\d{2}-\d{4}\b", "[SSN_REDACTED]"),
    # Phone numbers
    (r"\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", "[PHONE_REDACTED]"),
    # Email addresses
    (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[EMAIL_REDACTED]"),
    # Credit Card numbers
    (r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b", "[CARD_REDACTED]"),
]

COMPILED_PII = [(re.compile(pat, re.IGNORECASE), repl) for pat, repl in PII_PATTERNS]

# Prescription / Medication Blacklist (Doctors only)
MEDICATION_PRESCRIPTION_PATTERN = re.compile(
    r"\b(take|prescribe|prescribing|dosage|dose of|inject)\s+(\d+\s*(mg|ml|tablets?|capsules?|pills?)|amoxicillin|lisinopril|azithromycin|metformin|atorvastatin|prednisone|hydrocodone|tramadol|xanax|adderall)\b",
    re.IGNORECASE
)

# Unqualified Clinical Diagnosis Blacklist
DEFINITIVE_DIAGNOSIS_PATTERN = re.compile(
    r"\b(you have|i diagnose you with|your diagnosis is|you are diagnosed with)\s+(pneumonia|covid|influenza|bronchitis|diabetes|hypertension|migraine|concussion)\b",
    re.IGNORECASE
)


class JevClinicalReflexEngine:
    """
    Sub-millisecond System 1 Edge Governor.
    Executes BEFORE any LLM call to guarantee patient clinical safety.
    """

    @classmethod
    def evaluate_emergency_reflex(cls, message: str) -> Optional[Dict[str, Any]]:
        """
        Scans message for emergency red-flag presentations.
        Returns emergency deflection payload if matched, None if nominal.
        """
        start_ns = time.perf_counter_ns()
        for regex, code in COMPILED_RED_FLAGS:
            if regex.search(message):
                elapsed_ms = (time.perf_counter_ns() - start_ns) / 1_000_000.0
                return {
                    "is_emergency": True,
                    "trigger_code": code,
                    "decision_class": "CRITICAL_EMERGENCY_911",
                    "risk_band": "CRITICAL",
                    "severity": 10,
                    "urgency": "emergency",
                    "latency_ms": round(elapsed_ms, 3),
                    "token_cost_usd": 0.0,
                    "immediate_action": "CALL_911_OR_988",
                    "clinical_message": (
                        "🚨 CRITICAL CLINICAL SAFETY INTERCEPT: Your reported symptoms indicate a potential medical emergency. "
                        "Do not wait for online triage. Please call emergency services (911) or proceed immediately to the nearest Emergency Department. "
                        "For mental health crisis or suicidal thoughts, dial 988 directly."
                    ),
                    "emergency_links": {
                        "emergency": "tel:911",
                        "suicide_crisis": "tel:988",
                        "poison_control": "tel:18002221222"
                    }
                }
        return None

    @classmethod
    def sanitize_pii(cls, text: str) -> Tuple[str, int]:
        """
        Strips direct PII identifiers to preserve zero-knowledge compliance.
        """
        redactions = 0
        cleaned = text
        for regex, repl in COMPILED_PII:
            cleaned, count = regex.subn(repl, cleaned)
            redactions += count
        return cleaned, redactions


class JevClinicalSafetyArbiter:
    """
    Post-triage compliance & safety barrier.
    Validates LLM triage advice, enforces clinical rules, checks severity consistency,
    and assigns authoritative Jev Decision Class.
    """

    @classmethod
    def audit_triage_output(
        cls,
        raw_advice: str,
        metadata: Dict[str, Any],
        intake_summary: str = ""
    ) -> Dict[str, Any]:
        start_ns = time.perf_counter_ns()
        violations = []
        sanitized_advice = raw_advice
        
        severity = int(metadata.get("severity", 5))
        urgency = str(metadata.get("urgency", "routine")).lower()
        symptom = str(metadata.get("symptom", "Unspecified symptom"))

        # Rule 1: No direct medication prescriptions or dosages
        med_matches = MEDICATION_PRESCRIPTION_PATTERN.findall(raw_advice)
        if med_matches:
            violations.append({
                "rule": "UNAUTHORIZED_MEDICATION_PRESCRIPTION",
                "severity": "HIGH",
                "detail": "AI advice included direct dosage or medication prescription phrasing."
            })
            # Sanitize phrasing
            sanitized_advice = MEDICATION_PRESCRIPTION_PATTERN.sub("[Consult provider for prescription options]", sanitized_advice)

        # Rule 2: No unqualified clinical diagnosis
        diag_matches = DEFINITIVE_DIAGNOSIS_PATTERN.findall(raw_advice)
        if diag_matches:
            violations.append({
                "rule": "UNAUTHORIZED_DIAGNOSIS_ASSERTION",
                "severity": "MEDIUM",
                "detail": "AI advice made a definitive diagnosis assertion instead of an exploratory differential suggestion."
            })
            sanitized_advice = DEFINITIVE_DIAGNOSIS_PATTERN.sub("Your symptoms may be consistent with", sanitized_advice)

        # Rule 3: Severity vs Urgency consistency check
        if severity >= 9 and urgency != "emergency":
            urgency = "emergency"
            violations.append({
                "rule": "URGENCY_ELEVATED_TO_EMERGENCY",
                "severity": "CRITICAL",
                "detail": f"Severity {severity} was paired with lower urgency. Elevated to emergency."
            })
        elif severity >= 7 and urgency in ["self-care", "routine"]:
            urgency = "urgent"
            violations.append({
                "rule": "URGENCY_ELEVATED_TO_URGENT",
                "severity": "HIGH",
                "detail": f"Severity {severity} elevated urgency to urgent."
            })

        # Decision Class Determination
        if urgency == "emergency" or severity >= 9:
            decision_class = "CRITICAL_EMERGENCY_911"
            risk_band = "CRITICAL"
        elif urgency == "urgent" or severity >= 7:
            decision_class = "URGENT_TELEHEALTH_SAME_DAY"
            risk_band = "HIGH"
        elif severity >= 4:
            decision_class = "ROUTINE_CLINICAL_VISIT"
            risk_band = "MODERATE"
        else:
            decision_class = "HOME_CARE_MONITORING"
            risk_band = "LOW"

        # Generate cryptographic audit hash
        audit_payload = f"{symptom}|{severity}|{urgency}|{decision_class}|{time.time():.4f}"
        audit_hash = hashlib.sha256(audit_payload.encode()).hexdigest()

        elapsed_ms = (time.perf_counter_ns() - start_ns) / 1_000_000.0

        return {
            "arbiter_verdict": "CERTIFIED" if len(violations) == 0 else "CERTIFIED_WITH_REMEDIATIONS",
            "decision_class": decision_class,
            "risk_band": risk_band,
            "audited_severity": severity,
            "audited_urgency": urgency,
            "audited_symptom": symptom,
            "sanitized_advice": sanitized_advice,
            "safety_checks_passed": len(violations) == 0,
            "violations_detected": violations,
            "arbitration_time_ms": round(elapsed_ms, 3),
            "cryptographic_audit_hash": f"jev_cert_{audit_hash[:16]}"
        }


# ==============================================================================
# 3. Unit Test & Verification Suite
# ==============================================================================

def run_tests():
    print("=" * 70)
    print("🧪 Running Jev System 1 Clinical Engine Self-Test Suite")
    print("=" * 70)

    # Test 1: Emergency Chest Pain Reflex
    t1_msg = "I have severe crushing chest pain radiating to my left arm and jaw and I am sweating."
    res1 = JevClinicalReflexEngine.evaluate_emergency_reflex(t1_msg)
    assert res1 is not None, "Test 1 Failed: Emergency chest pain was not intercepted!"
    assert res1["decision_class"] == "CRITICAL_EMERGENCY_911"
    assert res1["latency_ms"] < 2.0, f"Test 1 Failed: Latency {res1['latency_ms']}ms exceeded 2ms threshold!"
    print(f"✔ Test 1 PASS: Emergency Reflex Intercept (Latency: {res1['latency_ms']}ms, Code: {res1['trigger_code']})")

    # Test 2: Stroke FAST Presentation
    t2_msg = "My mother has sudden facial droop and slurred speech since 10 minutes ago."
    res2 = JevClinicalReflexEngine.evaluate_emergency_reflex(t2_msg)
    assert res2 is not None, "Test 2 Failed: Stroke FAST sign not intercepted!"
    assert res2["is_emergency"] is True
    print(f"✔ Test 2 PASS: Stroke FAST Intercept (Latency: {res2['latency_ms']}ms, Code: {res2['trigger_code']})")

    # Test 3: Nominal Non-Emergency Inquiry
    t3_msg = "I have a mild runny nose and cough that started yesterday. No fever."
    res3 = JevClinicalReflexEngine.evaluate_emergency_reflex(t3_msg)
    assert res3 is None, "Test 3 Failed: Benign symptoms falsely triggered emergency reflex!"
    print("✔ Test 3 PASS: Benign Cough Passed Cleanly to System 2")

    # Test 4: PII Redaction
    t4_msg = "My name is John Doe, my SSN is 123-45-6789 and my phone is 410-555-0199. I have a sore throat."
    cleaned, red_cnt = JevClinicalReflexEngine.sanitize_pii(t4_msg)
    assert "[SSN_REDACTED]" in cleaned
    assert "[PHONE_REDACTED]" in cleaned
    assert red_cnt >= 2
    print(f"✔ Test 4 PASS: Zero-Knowledge PII Striping ({red_cnt} sensitive tokens masked)")

    # Test 5: Arbiter Output Validation (Prescription Blacklist)
    raw_adv = "Take 500mg Amoxicillin twice a day. You have bronchitis. Rest and drink fluids."
    meta = {"severity": 4, "symptom": "Chest congestion", "urgency": "routine"}
    audit = JevClinicalSafetyArbiter.audit_triage_output(raw_adv, meta)
    assert len(audit["violations_detected"]) >= 1
    assert "Take 500mg Amoxicillin" not in audit["sanitized_advice"]
    assert audit["arbiter_verdict"] == "CERTIFIED_WITH_REMEDIATIONS"
    print(f"✔ Test 5 PASS: Clinical Safety Arbiter Prescription Blacklist (Sanitized in {audit['arbitration_time_ms']}ms)")

    # Test 6: Inconsistent Severity Elevation
    raw_adv2 = "Your symptoms are very concerning. Schedule a routine visit."
    meta2 = {"severity": 9, "symptom": "Extreme dyspnea", "urgency": "routine"}
    audit2 = JevClinicalSafetyArbiter.audit_triage_output(raw_adv2, meta2)
    assert audit2["audited_urgency"] == "emergency"
    assert audit2["decision_class"] == "CRITICAL_EMERGENCY_911"
    print("✔ Test 6 PASS: High Severity (9/10) Automatically Elevated Urgency to Emergency")

    print("=" * 70)
    print("🎉 All 6 Jev Clinical Safety & Reflex Engine tests PASSED successfully!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
