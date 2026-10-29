import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isValidEmail,
  isValidPassword,
  isStrongPassword,
  isValidDob,
  sanitizeInput,
  sanitizeChatMessage,
} from "../../src/utils/validation.js";

// ═══════════════════════════════════════════════════════════
// Input Validation & Sanitization Tests
// ═══════════════════════════════════════════════════════════

describe("isValidEmail", () => {
  it("accepts standard email", () => {
    assert.ok(isValidEmail("user@example.com"));
  });

  it("accepts email with subdomain", () => {
    assert.ok(isValidEmail("user@mail.hospital.org"));
  });

  it("accepts email with + alias", () => {
    assert.ok(isValidEmail("user+tag@example.com"));
  });

  it("rejects empty string", () => {
    assert.strictEqual(isValidEmail(""), false);
  });

  it("rejects null", () => {
    assert.strictEqual(isValidEmail(null), false);
  });

  it("rejects string without @", () => {
    assert.strictEqual(isValidEmail("notanemail"), false);
  });

  it("rejects string with spaces", () => {
    assert.strictEqual(isValidEmail("user @example.com"), false);
  });

  it("trims leading/trailing whitespace", () => {
    assert.ok(isValidEmail("  user@example.com  "));
  });
});

describe("isValidPassword", () => {
  it("accepts 6+ character password", () => {
    assert.ok(isValidPassword("abc123"));
  });

  it("rejects 5 character password", () => {
    assert.strictEqual(isValidPassword("abc12"), false);
  });

  it("rejects empty string", () => {
    assert.strictEqual(isValidPassword(""), false);
  });

  it("rejects null", () => {
    assert.strictEqual(isValidPassword(null), false);
  });

  it("rejects non-string input", () => {
    assert.strictEqual(isValidPassword(123456), false);
  });
});

describe("isStrongPassword", () => {
  it("accepts password with upper, lower, digit, 8+ chars", () => {
    assert.ok(isStrongPassword("Abcdef12"));
  });

  it("rejects password without uppercase", () => {
    assert.strictEqual(isStrongPassword("abcdef12"), false);
  });

  it("rejects password without lowercase", () => {
    assert.strictEqual(isStrongPassword("ABCDEF12"), false);
  });

  it("rejects password without digit", () => {
    assert.strictEqual(isStrongPassword("Abcdefgh"), false);
  });

  it("rejects password shorter than 8 chars", () => {
    assert.strictEqual(isStrongPassword("Abc1"), false);
  });

  it("rejects null", () => {
    assert.strictEqual(isStrongPassword(null), false);
  });
});

describe("isValidDob", () => {
  it("accepts valid date MM/DD/YYYY", () => {
    assert.ok(isValidDob("01/15/1990"));
  });

  it("accepts boundary month 12", () => {
    assert.ok(isValidDob("12/31/2000"));
  });

  it("rejects month 00", () => {
    assert.strictEqual(isValidDob("00/15/1990"), false);
  });

  it("rejects month 13", () => {
    assert.strictEqual(isValidDob("13/15/1990"), false);
  });

  it("rejects day 00", () => {
    assert.strictEqual(isValidDob("01/00/1990"), false);
  });

  it("rejects day 32", () => {
    assert.strictEqual(isValidDob("01/32/1990"), false);
  });

  it("rejects YYYY-MM-DD format", () => {
    assert.strictEqual(isValidDob("1990-01-15"), false);
  });

  it("rejects empty string", () => {
    assert.strictEqual(isValidDob(""), false);
  });

  it("rejects null", () => {
    assert.strictEqual(isValidDob(null), false);
  });
});

describe("sanitizeInput", () => {
  it("strips HTML tags", () => {
    assert.strictEqual(sanitizeInput("<b>bold</b> text"), "bold text");
  });

  it("strips script tags", () => {
    const result = sanitizeInput('<script>alert("xss")</script>hello');
    assert.ok(!result.includes("script"), "Script tag should be removed");
    assert.ok(result.includes("hello"));
  });

  it("trims whitespace", () => {
    assert.strictEqual(sanitizeInput("  hello  "), "hello");
  });

  it("truncates to 5000 chars max", () => {
    const long = "a".repeat(6000);
    assert.strictEqual(sanitizeInput(long).length, 5000);
  });

  it("returns empty string for null", () => {
    assert.strictEqual(sanitizeInput(null), "");
  });

  it("returns empty string for undefined", () => {
    assert.strictEqual(sanitizeInput(undefined), "");
  });

  it("returns empty string for non-string", () => {
    assert.strictEqual(sanitizeInput(12345), "");
  });
});

describe("sanitizeChatMessage", () => {
  it("strips script tags from chat input", () => {
    const result = sanitizeChatMessage('<script>alert("x")</script>I have a headache');
    assert.ok(!result.includes("script"));
    assert.ok(result.includes("I have a headache"));
  });

  it("strips angle brackets", () => {
    const result = sanitizeChatMessage("test <img src=x onerror=alert(1)> end");
    assert.ok(!result.includes("<"));
    assert.ok(!result.includes(">"));
  });

  it("trims whitespace", () => {
    assert.strictEqual(sanitizeChatMessage("  hello  "), "hello");
  });

  it("truncates to 2000 chars max", () => {
    const long = "a".repeat(3000);
    assert.strictEqual(sanitizeChatMessage(long).length, 2000);
  });

  it("returns empty string for null", () => {
    assert.strictEqual(sanitizeChatMessage(null), "");
  });

  it("returns empty string for undefined", () => {
    assert.strictEqual(sanitizeChatMessage(undefined), "");
  });

  it("preserves normal clinical text", () => {
    const input = "I have had a headache for 3 days with nausea";
    assert.strictEqual(sanitizeChatMessage(input), input);
  });
});
