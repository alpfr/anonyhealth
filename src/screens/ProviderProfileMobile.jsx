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
    scheduling_url: "",
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
            scheduling_url: row.scheduling_url || "",
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

  // Returns an error string or null.
  // For known booking platforms (Calendly, Cal.com, etc.) we require at least
  // two path segments (handle + event slug) so patients land on a specific
  // appointment type rather than the provider's profile root page — which would
  // default to whichever event type the platform lists first.
  const validateSchedulingUrl = (raw) => {
    const v = raw?.trim();
    if (!v) return null;
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    let url;
    try { url = new URL(withScheme); } catch { return "Scheduling link is not a valid URL."; }
    if (!/^https?:$/.test(url.protocol)) return "Scheduling link must be http or https.";
    if (!url.hostname.includes(".")) return "Scheduling link is missing a valid domain.";
    const knownBookingHosts = ["calendly.com", "cal.com", "savvycal.com", "tidycal.com"];
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (knownBookingHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
      const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      if (parts.length === 0) {
        return "Scheduling link needs your handle — e.g. calendly.com/your-name/telehealth.";
      }
      if (parts.length === 1) {
        // Only a handle, no event type — patients will see the profile root and
        // may land on the wrong event. Require the specific event slug.
        return `Link directly to a specific appointment type — e.g. ${host}/${parts[0]}/telehealth-appointment. Without the event name patients may book the wrong type.`;
      }
    }
    return null;
  };

  // A softer, non-blocking version of the same check used for live inline
  // feedback while the provider is still typing (does not block Save).
  const schedulingUrlWarning = (() => {
    const v = form.scheduling_url?.trim();
    if (!v) return null;
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    let url;
    try { url = new URL(withScheme); } catch { return null; }
    const knownBookingHosts = ["calendly.com", "cal.com", "savvycal.com", "tidycal.com"];
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (knownBookingHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
      const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      if (parts.length <= 1) {
        return `⚠️ This looks like a profile page, not a specific event. Patients may land on the wrong appointment type. Add the event name — e.g. /${parts[0] ?? "your-name"}/telehealth-appointment`;
      }
    }
    return null;
  })();

  const testSchedulingUrl = () => {
    const v = form.scheduling_url?.trim();
    if (!v) return;
    const err = validateSchedulingUrl(v);
    if (err) { setError(err); return; }
    const href = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const save = async () => {
    if (!tenant?.id) return;
    const urlErr = validateSchedulingUrl(form.scheduling_url);
    if (urlErr) { setError(urlErr); return; }
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
    // 2200ms gives providers enough time to read the "Saved HH:MM" confirmation
    // before the screen auto-dismisses. 900ms was too fast to be noticed.
    setTimeout(() => onBack?.(), 2200);
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
            <Field label="Scheduling link" hint="Link to a specific appointment type (e.g. calendly.com/your-name/telehealth-appointment) so patients land on the right booking page.">
              <input
                value={form.scheduling_url}
                onChange={onChange("scheduling_url")}
                maxLength={1024}
                placeholder="https://calendly.com/your-name/telehealth-appointment"
                style={inputStyle}
              />
              {/* Live warning when URL looks like a profile root, not a specific event */}
              {schedulingUrlWarning && (
                <div style={{
                  marginTop: 6, padding: "8px 10px", borderRadius: 8,
                  background: "rgba(234, 179, 8, 0.08)", border: "1px solid rgba(234, 179, 8, 0.35)",
                  fontSize: 11.5, color: "#92400e", lineHeight: 1.5,
                  fontFamily: "'Outfit', sans-serif",
                }}>
                  {schedulingUrlWarning}
                </div>
              )}
              {form.scheduling_url?.trim() && (
                <button type="button" onClick={testSchedulingUrl} style={{
                  marginTop: 8, padding: "8px 12px", borderRadius: 8,
                  border: `1px solid ${t.border}`, background: "transparent", color: t.text,
                  fontSize: 12, fontWeight: 500, cursor: "pointer",
                }}>
                  Test link in new tab
                </button>
              )}
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
              {saving ? "Saving..." : "Save & close"}
            </button>
            <button onClick={() => onBack?.()} disabled={saving} style={{
              marginTop: 10, padding: "12px 16px", borderRadius: 12,
              border: `1px solid ${t.border}`, background: "transparent", color: t.text,
              fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer",
              width: "100%",
            }}>
              Done
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
