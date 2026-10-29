import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseRoute } from "../../src/utils/parseRoute.js";

// ═══════════════════════════════════════════════════════════
// parseRoute — URL-to-route state machine tests
// Ensures all SPA routes are correctly parsed from the URL.
// ═══════════════════════════════════════════════════════════

// Helper: set window.location.pathname for tests.
function withPath(path, fn) {
  const original = window.location.pathname;
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...window.location, pathname: path },
  });
  try {
    fn();
  } finally {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, pathname: original },
    });
  }
}

describe("parseRoute", () => {
  it("returns app route for root path /", () => {
    withPath("/", () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "app");
    });
  });

  it("parses /for-providers as landing", () => {
    withPath("/for-providers", () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "landing");
    });
  });

  it("parses /signin as auth with mode signin", () => {
    withPath("/signin", () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "auth");
      assert.strictEqual(route.mode, "signin");
    });
  });

  it("parses /signup as auth with mode signup", () => {
    withPath("/signup", () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "auth");
      assert.strictEqual(route.mode, "signup");
    });
  });

  it("parses /reset-password correctly", () => {
    withPath("/reset-password", () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "reset_password");
    });
  });

  it("parses /terms as legal page", () => {
    withPath("/terms", () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "legal");
      assert.strictEqual(route.page, "terms");
    });
  });

  it("parses /privacy as legal page", () => {
    withPath("/privacy", () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "legal");
      assert.strictEqual(route.page, "privacy");
    });
  });

  it("parses /hipaa as legal page", () => {
    withPath("/hipaa", () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "legal");
      assert.strictEqual(route.page, "hipaa");
    });
  });

  it("parses /billing/success as billing_success", () => {
    withPath("/billing/success", () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "billing_success");
    });
  });

  it("parses /billing/cancel as billing_cancel", () => {
    withPath("/billing/cancel", () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "billing_cancel");
    });
  });

  it("parses /simulation as simulation", () => {
    withPath("/simulation", () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "simulation");
    });
  });

  it("parses /demo as simulation", () => {
    withPath("/demo", () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "simulation");
    });
  });

  it("parses invite token from /invite/<token>", () => {
    const token = "abcDEF123_-4567890xyz";
    withPath(`/invite/${token}`, () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "invite");
      assert.strictEqual(route.token, token);
    });
  });

  it("rejects invite token shorter than 16 chars", () => {
    withPath("/invite/short", () => {
      const route = parseRoute();
      // Should NOT match invite — falls through to app.
      assert.strictEqual(route.kind, "app");
    });
  });

  it("rejects invite token longer than 128 chars", () => {
    const longToken = "a".repeat(129);
    withPath(`/invite/${longToken}`, () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "app");
    });
  });

  it("falls back to app for unknown paths", () => {
    withPath("/some/unknown/path", () => {
      const route = parseRoute();
      assert.strictEqual(route.kind, "app");
    });
  });
});
