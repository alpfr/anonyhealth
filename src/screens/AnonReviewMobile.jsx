import { T, Icons } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";

// ═══════════════════════════════════════════════════════════
// SCREEN: ANONYMOUS SYMPTOM REVIEW (MOBILE)
// ═══════════════════════════════════════════════════════════
export const AnonReviewMobile = ({ theme, onBack, onConfirm }) => {
  const t = T[theme];
  const isDark = theme === "dark";

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px",
          borderRadius: 8, background: t.accentGlow, border: `1px solid ${t.accent}15`,
          fontSize: 11.5, fontWeight: 600, color: t.accent, fontFamily: "'Outfit', sans-serif",
          marginBottom: 16,
        }}>
          {Icons.eyeOff(t.accent, 13)} Confidential mode
        </div>

        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28,
          fontWeight: 400, color: t.text, margin: "0 0 6px", letterSpacing: "-0.02em", lineHeight: 1.15,
        }}>
          Confidential<br />symptom review
        </h1>
        <p style={{ fontSize: 14, color: t.textSec, fontFamily: "'Outfit', sans-serif", margin: "0 0 28px", lineHeight: 1.5 }}>
          with our AI agent.
        </p>

        {/* Symptom Card */}
        <div style={{
          padding: 20, borderRadius: 16, background: t.bgCard, border: `1px solid ${t.border}`,
          boxShadow: t.shadow, marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            {Icons.shield(t.accent, 16)}
            <span style={{ fontSize: 12, fontWeight: 600, color: t.accent, fontFamily: "'Outfit', sans-serif" }}>Restricted Access Summary</span>
          </div>
          <p style={{ fontSize: 15, color: t.text, fontFamily: "'Outfit', sans-serif", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
            I've had a sore throat for several days.
          </p>
          <div style={{
            marginTop: 14, padding: "8px 14px", borderRadius: 10, background: t.urgentBg,
            border: `1px solid ${t.urgentBorder}`, display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.urgentText, fontFamily: "'Outfit', sans-serif" }}>⚠ May require medical attention</span>
          </div>
        </div>

        <button onClick={onConfirm} style={{
          width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: "pointer",
          background: t.gradient, color: "#fff", fontSize: 15, fontWeight: 700,
          fontFamily: "'Outfit', sans-serif",
          boxShadow: isDark ? `0 0 24px ${t.accent}30` : `0 4px 16px ${t.accent}20`,
        }}>
          Confirm Appointment
        </button>

        <div style={{
          display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 14,
        }}>
          {Icons.lock(t.textMut, 12)}
          <span style={{ fontSize: 11, color: t.textMut, fontFamily: "'Outfit', sans-serif" }}>
            Your records are private and never shared with insurance
          </span>
        </div>
      </div>
    </>
  );
};
