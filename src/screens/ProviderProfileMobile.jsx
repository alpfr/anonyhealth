import { useEffect, useState } from "react";
import { T } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";
import { useTenant } from "../context/TenantContext";
import { getProviderProfile, upsertProviderProfile } from "../services/providerProfile";
import { logAuditEvent } from "../utils/audit";

export const ProviderProfileMobile = ({ theme, onBack }) => {
  const t = T[theme];
  const { tenant } = useTenant();
  const [form, setForm] = useState({
    display_name: "",
    credentials: "",
    specialty: "",
    bio: "",
    avatar_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!tenant?.id) return;
    getProviderProfile(tenant.id)
      .then((row) => {
        if (cancelled) return;
        if (row) {
          setForm({
            display_name: row.display_name || "",
            credentials: row.credentials || "",
            specialty: row.specialty || "",
            bio: row.bio || "",
            avatar_url: row.avatar_url || "",
          });
        } else if (tenant?.name) {
          setForm((f) => ({ ...f, display_name: tenant.name }));
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [tenant?.id, tenant?.name]);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    setError("");
    const { error: err } = await upsertProviderProfile(tenant.id, form);
    setSaving(false);
    if (err) {
      setError(err.message || "Failed to save.");
      return;
    }
    setSavedAt(new Date());
    logAuditEvent("profile.update", "provider profile saved");
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1px solid ${t.border}`, background: t.bgCard, color: t.text,
    fontSize: 14, outline: "none", fontFamily: "'Outfit', sans-serif",
    boxSizing: "border-box",
  };

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20, fontFamily: "'Outfit', sans-serif", color: t.text }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Provider profile</h1>
        <p style={{ fontSize: 12, color: t.textSec, margin: "0 0 20px" }}>
          Shown to your patients on their dashboard.
        </p>

        {loading ? (
          <div style={{ fontSize: 13, color: t.textMut }}>Loading...</div>
        ) : (
          <>
            <Field label="Display name" required>
              <input value={form.display_name} onChange={onChange("display_name")} maxLength={120} style={inputStyle} />
            </Field>
            <Field label="Credentials" hint="e.g. MD, NP, LCSW">
              <input value={form.credentials} onChange={onChange("credentials")} maxLength={80} style={inputStyle} />
            </Field>
            <Field label="Specialty" hint="e.g. Primary Care, Dermatology">
              <input value={form.specialty} onChange={onChange("specialty")} maxLength={80} style={inputStyle} />
            </Field>
            <Field label="Bio" hint="Up to 4000 characters">
              <textarea value={form.bio} onChange={onChange("bio")} maxLength={4000} rows={6}
                style={{ ...inputStyle, resize: "vertical" }} />
            </Field>
            <Field label="Avatar URL" hint="Optional. Public image URL.">
              <input value={form.avatar_url} onChange={onChange("avatar_url")} maxLength={1024} style={inputStyle} />
            </Field>

            {error && <div style={{ marginTop: 12, color: "#dc2626", fontSize: 13 }}>{error}</div>}
            {savedAt && !error && (
              <div style={{ marginTop: 12, color: "#16a34a", fontSize: 13 }}>
                Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}

            <button onClick={save} disabled={saving || !form.display_name.trim()} style={{
              marginTop: 16, padding: "14px 16px", borderRadius: 12, border: "none",
              background: t.accent, color: "#fff", fontSize: 15, fontWeight: 600,
              cursor: saving ? "wait" : "pointer", opacity: (saving || !form.display_name.trim()) ? 0.6 : 1,
              width: "100%",
            }}>
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        )}
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
