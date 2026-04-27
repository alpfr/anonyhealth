import { useState } from "react";
import { T } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";
import { createPatientProfile } from "../services/patientProfile";
import { logAuditEvent } from "../utils/audit";

export const PatientProfileSetup = ({ theme, userId, tenantId, tenantName, onComplete }) => {
  const t = T[theme];
  const [form, setForm] = useState({ full_name: "", dob: "", address: "" });
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setError("");
    if (!consent) {
      setError("Please confirm consent to share these details with your provider.");
      return;
    }
    setSaving(true);
    const { error: err } = await createPatientProfile(userId, tenantId, form);
    setSaving(false);
    if (err) {
      setError(err.message || "Failed to save profile.");
      return;
    }
    logAuditEvent("profile.create", "patient profile created");
    onComplete?.();
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1px solid ${t.border}`, background: t.bgCard, color: t.text,
    fontSize: 14, outline: "none", fontFamily: "'Outfit', sans-serif",
    boxSizing: "border-box",
  };

  const valid = form.full_name.trim() && form.dob && form.address.trim() && consent;

  return (
    <>
      <MobileNav theme={theme} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20, fontFamily: "'Outfit', sans-serif", color: t.text }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Complete your profile</h1>
        <p style={{ fontSize: 13, color: t.textSec, margin: "0 0 20px", lineHeight: 1.5 }}>
          {tenantName ? `${tenantName} needs a few details` : "Your provider needs a few details"} before
          you can use AnonyHealth. This information is shared only with your provider.
        </p>

        <Field label="Full name" required>
          <input value={form.full_name} onChange={onChange("full_name")} maxLength={120}
            autoComplete="name" style={inputStyle} />
        </Field>
        <Field label="Date of birth" required>
          <input type="date" value={form.dob} onChange={onChange("dob")} style={inputStyle} />
        </Field>
        <Field label="Address" required hint="Street, city, state, postal code">
          <textarea value={form.address} onChange={onChange("address")} maxLength={500} rows={3}
            autoComplete="street-address" style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        <label style={{
          display: "flex", gap: 10, alignItems: "flex-start", marginTop: 8, cursor: "pointer",
          fontSize: 13, color: t.textSec, lineHeight: 1.5,
        }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
            style={{ marginTop: 3, flexShrink: 0 }} />
          <span>
            I consent to sharing this information with my provider for the purpose of care, in line
            with the <a href="/privacy" target="_blank" rel="noopener" style={{ color: t.accent }}>Privacy Notice</a>
            {" "}and <a href="/hipaa" target="_blank" rel="noopener" style={{ color: t.accent }}>HIPAA Notice</a>.
          </span>
        </label>

        {error && <div style={{ marginTop: 12, color: "#dc2626", fontSize: 13 }}>{error}</div>}

        <button onClick={submit} disabled={saving || !valid} style={{
          marginTop: 18, padding: "14px 16px", borderRadius: 12, border: "none",
          background: t.accent, color: "#fff", fontSize: 15, fontWeight: 600,
          cursor: saving ? "wait" : "pointer", opacity: (saving || !valid) ? 0.6 : 1,
          width: "100%",
        }}>
          {saving ? "Saving..." : "Save and continue"}
        </button>
      </div>
    </>
  );
};

function Field({ label, hint, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>
        {label} {required && <span style={{ color: "#dc2626" }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
