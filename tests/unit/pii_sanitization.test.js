import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeClientPII,
} from "../../src/utils/jevReflex.js";

// ═══════════════════════════════════════════════════════════
// sanitizeClientPII — Zero-Knowledge PII Scrubbing Tests
// HIPAA-critical: these tests ensure no PII leaks to the AI backend.
// ═══════════════════════════════════════════════════════════

describe("sanitizeClientPII", () => {
  // ─── SSN ─────────────────────────────────────────────────
  it("redacts SSN in standard format (XXX-XX-XXXX)", () => {
    const { sanitized, redactedCount } = sanitizeClientPII("my ssn is 123-45-6789");
    assert.ok(!sanitized.includes("123-45-6789"), "SSN should be scrubbed");
    assert.ok(sanitized.includes("[SSN_REDACTED]"), "SSN should be replaced with mask");
    assert.strictEqual(redactedCount, 1);
  });

  it("redacts multiple SSNs in the same message", () => {
    const { sanitized, redactedCount } = sanitizeClientPII(
      "mine is 111-22-3333 and hers is 444-55-6666"
    );
    assert.ok(!sanitized.includes("111-22-3333"));
    assert.ok(!sanitized.includes("444-55-6666"));
    assert.strictEqual(redactedCount, 2);
  });

  // ─── Phone Numbers ──────────────────────────────────────
  it("redacts US phone number (XXX) XXX-XXXX", () => {
    const { sanitized, redactedCount } = sanitizeClientPII("call me at (410) 555-1234");
    assert.ok(!sanitized.includes("(410) 555-1234"), "Phone should be scrubbed");
    assert.ok(sanitized.includes("[PHONE_REDACTED]"));
    assert.strictEqual(redactedCount, 1);
  });

  it("redacts phone with country code +1", () => {
    const { sanitized } = sanitizeClientPII("reach me at +1-202-555-0199");
    assert.ok(!sanitized.includes("202-555-0199"));
    assert.ok(sanitized.includes("[PHONE_REDACTED]"));
  });

  it("redacts phone in dot-separated format", () => {
    const { sanitized } = sanitizeClientPII("my number is 410.555.1234");
    assert.ok(!sanitized.includes("410.555.1234"));
    assert.ok(sanitized.includes("[PHONE_REDACTED]"));
  });

  // ─── Email Addresses ───────────────────────────────────
  it("redacts email addresses", () => {
    const { sanitized, redactedCount } = sanitizeClientPII(
      "send it to john.doe@example.com please"
    );
    assert.ok(!sanitized.includes("john.doe@example.com"), "Email should be scrubbed");
    assert.ok(sanitized.includes("[EMAIL_REDACTED]"));
    assert.strictEqual(redactedCount, 1);
  });

  it("redacts email with + alias", () => {
    const { sanitized } = sanitizeClientPII("email me at user+tag@hospital.org");
    assert.ok(!sanitized.includes("user+tag@hospital.org"));
    assert.ok(sanitized.includes("[EMAIL_REDACTED]"));
  });

  // ─── Credit Card Numbers ──────────────────────────────
  it("redacts credit card number (XXXX-XXXX-XXXX-XXXX)", () => {
    const { sanitized, redactedCount } = sanitizeClientPII(
      "my card is 4111-1111-1111-1111"
    );
    assert.ok(!sanitized.includes("4111-1111-1111-1111"), "Card should be scrubbed");
    assert.ok(sanitized.includes("[CARD_REDACTED]"));
    assert.strictEqual(redactedCount, 1);
  });

  it("redacts credit card without separators", () => {
    const { sanitized } = sanitizeClientPII("card 4111111111111111");
    assert.ok(!sanitized.includes("4111111111111111"));
    assert.ok(sanitized.includes("[CARD_REDACTED]"));
  });

  it("redacts credit card with spaces", () => {
    const { sanitized } = sanitizeClientPII("card 4111 1111 1111 1111");
    assert.ok(!sanitized.includes("4111 1111 1111 1111"));
    assert.ok(sanitized.includes("[CARD_REDACTED]"));
  });

  // ─── Mixed PII ──────────────────────────────────────────
  it("redacts multiple PII types in one message", () => {
    const input = "I'm John, SSN 123-45-6789, email john@test.com, phone (410) 555-0000";
    const { sanitized, redactedCount } = sanitizeClientPII(input);
    assert.ok(!sanitized.includes("123-45-6789"));
    assert.ok(!sanitized.includes("john@test.com"));
    assert.ok(!sanitized.includes("(410) 555-0000"));
    assert.ok(redactedCount >= 3, `Expected at least 3 redactions, got ${redactedCount}`);
  });

  // ─── Edge Cases ─────────────────────────────────────────
  it("returns empty input unchanged", () => {
    const result = sanitizeClientPII("");
    assert.deepStrictEqual(result, { sanitized: "", redactedCount: 0 });
  });

  it("returns null input safely", () => {
    const result = sanitizeClientPII(null);
    assert.deepStrictEqual(result, { sanitized: null, redactedCount: 0 });
  });

  it("returns undefined input safely", () => {
    const result = sanitizeClientPII(undefined);
    assert.deepStrictEqual(result, { sanitized: undefined, redactedCount: 0 });
  });

  it("leaves clean text untouched", () => {
    const input = "I have a headache and sore throat for 3 days";
    const { sanitized, redactedCount } = sanitizeClientPII(input);
    assert.strictEqual(sanitized, input, "Clean clinical text should pass through");
    assert.strictEqual(redactedCount, 0);
  });

  it("preserves clinical numbers that are not PII", () => {
    const input = "My blood pressure is 120/80 and heart rate is 72";
    const { sanitized, redactedCount } = sanitizeClientPII(input);
    assert.strictEqual(sanitized, input, "Vital signs should not be redacted");
    assert.strictEqual(redactedCount, 0);
  });
});
