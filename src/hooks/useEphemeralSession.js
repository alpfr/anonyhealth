import { useEffect, useRef, useCallback } from "react";

/**
 * useEphemeralSession
 * ===================
 * Client-Side Zero-Trace Privacy Guardian.
 * Automatically purges sensitive in-memory and local session cache
 * after a period of user inactivity (default: 15 minutes) to prevent
 * accidental data exposure on shared or unattended devices.
 *
 * @param {object} options
 * @param {number} [options.timeoutMs=900000] - Inactivity timeout in ms (default 15 minutes)
 * @param {Function} [options.onTimeout] - Optional callback triggered on timeout
 * @param {boolean} [options.enabled=true] - Whether session auto-wipe is active
 */
export function useEphemeralSession({
  timeoutMs = 15 * 60 * 1000,
  onTimeout = null,
  enabled = true,
} = {}) {
  const timerRef = useRef(null);
  const lastActiveRef = useRef(Date.now());

  const purgeEphemeralData = useCallback(() => {
    try {
      // Clear sensitive temporary session keys without corrupting permanent config
      const keysToPurge = [
        "anonyhealth_triage_draft",
        "anonyhealth_recent_symptom",
        "anonyhealth_temp_soap",
      ];
      for (const k of keysToPurge) {
        sessionStorage.removeItem(k);
        localStorage.removeItem(k);
      }
    } catch {
      // Storage access blocked or restricted
    }

    if (typeof onTimeout === "function") {
      onTimeout();
    }
  }, [onTimeout]);

  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (enabled) {
      timerRef.current = setTimeout(() => {
        purgeEphemeralData();
      }, timeoutMs);
    }
  }, [enabled, timeoutMs, purgeEphemeralData]);

  useEffect(() => {
    if (!enabled) return;

    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll"];
    const handleActivity = () => {
      // Throttle reset calls to at most once every 5 seconds
      if (Date.now() - lastActiveRef.current > 5000) {
        resetTimer();
      }
    };

    resetTimer();

    for (const evt of events) {
      window.addEventListener(evt, handleActivity, { passive: true });
    }

    // Auto-wipe on tab / window close if sessionStorage was used
    const handleBeforeUnload = () => {
      try {
        sessionStorage.removeItem("anonyhealth_triage_draft");
      } catch {
        /* noop */
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const evt of events) {
        window.removeEventListener(evt, handleActivity);
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, resetTimer]);

  return { resetTimer, purgeEphemeralData };
}
