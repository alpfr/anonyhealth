import { useEffect, useRef, useCallback } from "react";
import { T } from "../constants/theme";

/**
 * EmergencyInterceptModal
 * =======================
 * Sub-millisecond clinical safety intercept modal triggered by the
 * Jev System 1 Reflex Engine. Prevents delay during life-threatening presentations.
 */
export const EmergencyInterceptModal = ({ isOpen, onClose, interceptData, theme = "light" }) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus trap: capture focus when modal opens, restore when it closes.
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;

    // Focus the first interactive element after render.
    const timer = setTimeout(() => {
      const focusable = modalRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable?.length) focusable[0].focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = modalRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus to previously focused element.
      if (previousFocusRef.current?.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || !interceptData) return null;
  const t = T[theme] || T.light;
  const isDark = theme === "dark";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={interceptData.title || "Emergency clinical safety intercept"}
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: isDark ? "#161B2E" : "#FFFFFF",
          border: `2px solid ${t.danger}`,
          borderRadius: "24px",
          padding: "24px",
          boxShadow: isDark
            ? "0 20px 50px rgba(220, 38, 38, 0.35)"
            : "0 20px 50px rgba(220, 38, 38, 0.20)",
          color: t.text,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Hazard Stripe Accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "6px",
            background: "linear-gradient(90deg, #DC2626 0%, #EF4444 50%, #B91C1C 100%)",
          }}
        />

        {/* Warning Icon & Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "16px",
              backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2",
              border: "1px solid #FCA5A5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              flexShrink: 0,
            }}
          >
            🚨
          </div>
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "800",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: t.danger,
              }}
            >
              Jev System 1 Clinical Intercept
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: "700",
                color: isDark ? "#FCA5A5" : "#991B1B",
                lineHeight: "1.2",
              }}
            >
              {interceptData.title || "Potential Medical Emergency"}
            </h2>
          </div>
        </div>

        {/* Clinical Warning Body */}
        <div
          style={{
            backgroundColor: isDark ? "rgba(220, 38, 38, 0.12)" : "#FEF2F2",
            borderRadius: "14px",
            padding: "14px 16px",
            fontSize: "13px",
            lineHeight: "1.5",
            color: isDark ? "#FECACA" : "#7F1D1D",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            marginBottom: "20px",
          }}
        >
          <div style={{ fontWeight: "700", marginBottom: "4px" }}>
            Immediate In-Person Care Required
          </div>
          <div>
            {interceptData.detail ||
              "Your symptoms indicate a critical condition that cannot be evaluated safely via an online chat. Delaying care could be dangerous."}
          </div>
        </div>

        {/* Emergency Hotlines Action Center */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          <a
            href="tel:911"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              backgroundColor: "#DC2626",
              color: "#FFFFFF",
              fontWeight: "700",
              fontSize: "16px",
              padding: "14px 20px",
              borderRadius: "14px",
              textDecoration: "none",
              boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
              transition: "transform 0.1s ease",
            }}
          >
            <span>📞</span>
            <span>Call 911 Emergency Services</span>
          </a>

          <a
            href="tel:988"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              backgroundColor: isDark ? "#2A3352" : "#F3F4F6",
              color: isDark ? "#E2E8F0" : "#1E293B",
              fontWeight: "600",
              fontSize: "14px",
              padding: "12px 18px",
              borderRadius: "12px",
              textDecoration: "none",
              border: `1px solid ${t.border}`,
            }}
          >
            <span>💬</span>
            <span>Call / Text 988 Suicide & Crisis Lifeline</span>
          </a>

          <a
            href="tel:18002221222"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              backgroundColor: "transparent",
              color: t.textSec,
              fontSize: "12px",
              padding: "6px",
              textDecoration: "none",
            }}
          >
            <span>Maryland Poison Center: 1-800-222-1222</span>
          </a>
        </div>

        {/* Dismiss / Secondary Action */}
        <div style={{ borderTop: `1px solid ${t.borderLight}`, paddingTop: "14px", textAlign: "center" }}>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: "none",
              border: "none",
              color: t.textMut,
              fontSize: "12px",
              cursor: "pointer",
              padding: "6px 12px",
              textDecoration: "underline",
            }}
          >
            I am already receiving medical care / close warning
          </button>
        </div>
      </div>
    </div>
  );
};
