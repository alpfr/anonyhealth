import { useCallback, useEffect, useState } from "react";
import { T } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";
import { useTenant } from "../context/TenantContext";
import { useAuth } from "../context/AuthContext";
import {
  createAppointmentRequest,
  listMyAppointmentRequests,
  cancelRequest,
} from "../services/appointmentRequests";

const WINDOW_OPTIONS = [
  { value: "morning", label: "Morning", hint: "8am – 12pm" },
  { value: "afternoon", label: "Afternoon", hint: "12pm – 5pm" },
  { value: "evening", label: "Evening", hint: "5pm – 8pm" },
];

const URGENCY_OPTIONS = [
  { value: "routine", label: "Routine" },
  { value: "this_week", label: "This week" },
  { value: "asap", label: "ASAP" },
];

const STATUS_LABEL = {
  requested: { text: "Awaiting provider", color: "#d97706" },
  confirmed: { text: "Confirmed", color: "#16a34a" },
  counter_proposed: { text: "New time proposed", color: "#2563eb" },
  declined: { text: "Declined", color: "#dc2626" },
  cancelled: { text: "Cancelled", color: "#64748b" },
};

const today = () => new Date().toISOString().slice(0, 10);

export const BookAppointmentMobile = ({ theme, onBack }) => {
  const t = T[theme];
  const { tenant } = useTenant();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [form, setForm] = useState({
    preferred_date: "",
    preferred_window: "morning",
    reason: "",
    urgency: "routine",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try { setRequests(await listMyAppointmentRequests(userId)); }
    catch (e) { setError(e.message || "Failed to load requests."); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const onChange = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!tenant?.id || !userId) return;
    setError("");
    setSubmitting(true);
    const { error: err } = await createAppointmentRequest(tenant.id, userId, form);
    setSubmitting(false);
    if (err) { setError(err.message || "Failed to send request."); return; }
    setForm({ preferred_date: "", preferred_window: "morning", reason: "", urgency: "routine" });
    refresh();
  };

  const cancel = async (id) => {
    const { error: err } = await cancelRequest(id);
    if (err) { setError(err.message || "Failed to cancel."); return; }
    refresh();
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    border: `1px solid ${t.border}`, background: t.bgCard, color: t.text,
    fontSize: 14, outline: "none", fontFamily: "'Outfit', sans-serif",
    boxSizing: "border-box",
  };
  const valid = form.preferred_date && form.reason.trim();

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20, fontFamily: "'Outfit', sans-serif", color: t.text }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Book an appointment</h1>
        <p style={{ fontSize: 12, color: t.textSec, margin: "0 0 20px" }}>
          Send a request to {tenant?.name || "your provider"}. They'll confirm by email.
        </p>

        <Field label="Preferred date" required>
          <input type="date" min={today()} value={form.preferred_date}
            onChange={(e) => onChange("preferred_date")(e.target.value)} style={inputStyle} />
        </Field>

        <Field label="Time of day" required>
          <SegmentedControl t={t} options={WINDOW_OPTIONS} value={form.preferred_window}
            onChange={onChange("preferred_window")} />
        </Field>

        <Field label="Urgency" required>
          <SegmentedControl t={t} options={URGENCY_OPTIONS} value={form.urgency}
            onChange={onChange("urgency")} />
        </Field>

        <Field label="Reason for visit" required hint="Brief description — your provider will see this">
          <textarea value={form.reason} onChange={(e) => onChange("reason")(e.target.value)}
            maxLength={2000} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
        </Field>

        {error && <div style={{ marginTop: 12, color: "#dc2626", fontSize: 13 }}>{error}</div>}

        <button onClick={submit} disabled={submitting || !valid} style={{
          marginTop: 16, padding: "14px 16px", borderRadius: 12, border: "none",
          background: t.accent, color: "#fff", fontSize: 15, fontWeight: 600,
          cursor: submitting ? "wait" : "pointer", opacity: (submitting || !valid) ? 0.6 : 1,
          width: "100%",
        }}>
          {submitting ? "Sending..." : "Send request"}
        </button>

        <h2 style={{ fontSize: 13, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.06em", margin: "28px 0 10px" }}>
          Your requests
        </h2>

        {loading && <div style={{ fontSize: 13, color: t.textMut }}>Loading...</div>}

        {!loading && requests.length === 0 && (
          <div style={{ fontSize: 13, color: t.textSec, padding: 16, textAlign: "center",
            background: t.bgCard, border: `1px dashed ${t.border}`, borderRadius: 12 }}>
            No requests yet.
          </div>
        )}

        {requests.map((r) => {
          const status = STATUS_LABEL[r.status] || { text: r.status, color: t.textMut };
          const cancellable = r.status === "requested" || r.status === "counter_proposed" || r.status === "confirmed";
          return (
            <div key={r.id} style={{
              padding: 14, marginBottom: 8, borderRadius: 12,
              background: t.bgCard, border: `1px solid ${t.border}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {new Date(r.preferred_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  <span style={{ fontWeight: 400, color: t.textSec }}> · {r.preferred_window}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: status.color }}>{status.text}</div>
              </div>
              {r.proposed_at && (
                <div style={{ fontSize: 12, color: t.text, marginTop: 4 }}>
                  Time: {new Date(r.proposed_at).toLocaleString()}
                </div>
              )}
              {r.provider_note && (
                <div style={{ fontSize: 12, color: t.textSec, marginTop: 4, fontStyle: "italic" }}>
                  "{r.provider_note}"
                </div>
              )}
              <div style={{ fontSize: 11, color: t.textMut, marginTop: 6 }}>
                {r.reason} · {r.urgency.replace("_", " ")}
              </div>
              {cancellable && (
                <button onClick={() => cancel(r.id)} style={{
                  marginTop: 10, padding: "6px 10px", borderRadius: 8,
                  background: "transparent", border: `1px solid ${t.border}`, color: t.text,
                  fontSize: 12, cursor: "pointer",
                }}>
                  Cancel request
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

function Field({ label, hint, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 }}>
        {label} {required && <span style={{ color: "#dc2626" }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function SegmentedControl({ t, options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)} style={{
            flex: 1, padding: "10px 8px", borderRadius: 10, cursor: "pointer",
            border: `1px solid ${active ? t.accent : t.border}`,
            background: active ? `${t.accent}15` : "transparent",
            color: active ? t.accent : t.text, fontWeight: active ? 600 : 500, fontSize: 13,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <span>{opt.label}</span>
            {opt.hint && <span style={{ fontSize: 10, color: t.textMut, fontWeight: 400 }}>{opt.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
