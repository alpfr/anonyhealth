import { useState } from "react";
import { T } from "../constants/theme";
import { callFunction } from "../utils/functions";

export const DoctorOnboardingMobile = ({ theme }) => {
  const t = T[theme];
  const [practiceName, setPracticeName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const startCheckout = async () => {
    const trimmed = practiceName.trim();
    if (trimmed.length === 0) { setError("Practice name is required."); return; }

    setSubmitting(true);
    setError("");
    try {
      const { url } = await callFunction("stripe-checkout", { practice_name: trimmed });
      if (!url) throw new Error("Checkout URL missing");
      window.location.href = url;
    } catch (e) {
      setError(e.message || "Unable to start checkout.");
      setSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 24px", background: t.bg, color: t.text, fontFamily: "'Outfit', sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Start your practice</h1>
      <p style={{ color: t.textSec, fontSize: 14, marginTop: 8 }}>
        Name your practice and activate a 14-day free trial. You won't be charged until the trial ends.
      </p>

      <label style={{ marginTop: 24, fontSize: 12, color: t.textSec }}>Practice name</label>
      <input
        type="text"
        value={practiceName}
        onChange={(e) => setPracticeName(e.target.value)}
        placeholder="Dr. Smith Family Medicine"
        maxLength={120}
        style={{
          marginTop: 6, padding: "12px 14px", borderRadius: 10,
          border: `1px solid ${t.border}`, background: t.bgNav, color: t.text,
          fontSize: 15, outline: "none",
        }}
      />

      {error && (
        <div style={{ marginTop: 12, color: "#dc2626", fontSize: 13 }}>{error}</div>
      )}

      <button
        onClick={startCheckout}
        disabled={submitting}
        style={{
          marginTop: 24, padding: "14px 16px", borderRadius: 12, border: "none",
          background: t.accent, color: "#fff", fontSize: 15, fontWeight: 600,
          cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? "Redirecting to Stripe..." : "Start 14-day free trial"}
      </button>

      <p style={{ marginTop: 16, color: t.textMut, fontSize: 11, lineHeight: 1.5 }}>
        Your billing is managed by Stripe. No patient health data is ever shared with Stripe —
        only your email and a tenant identifier.
      </p>
    </div>
  );
};
