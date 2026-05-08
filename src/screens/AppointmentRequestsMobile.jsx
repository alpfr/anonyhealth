import { useCallback, useEffect, useState } from "react";
import { T } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";
import { useTenant } from "../context/TenantContext";
import {
  listTenantAppointmentRequests,
  confirmRequest,
  counterPropose,
  declineRequest,
} from "../services/appointmentRequests";
import { listTenantPatients } from "../services/doctor";

const STATUS_LABEL = {
  requested: { text: "New", color: "#d97706" },
  confirmed: { text: "Confirmed", color: "#16a34a" },
  counter_proposed: { text: "Awaiting patient", color: "#2563eb" },
  declined: { text: "Declined", color: "#dc2626" },
  cancelled: { text: "Cancelled", color: "#64748b" },
};

const FILTER_TABS = [
  { key: "open", label: "Open" },
  { key: "all", label: "All" },
];

export const AppointmentRequestsMobile = ({ theme, onBack }) => {
  const t = T[theme];
  const { tenant } = useTenant();
  const [requests, setRequests] = useState([]);
  const [namesById, setNamesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("open");
  const [activeId, setActiveId] = useState(null);
  const [action, setAction] = useState(null); // 'confirm' | 'counter' | 'decline'
  const [proposed, setProposed] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const [reqs, members] = await Promise.all([
        listTenantAppointmentRequests(tenant.id),
        listTenantPatients(tenant.id),
      ]);
      setRequests(reqs);
      setNamesById(Object.fromEntries(
        members.map((m) => [m.user_id, m.patient_profiles?.full_name || "(No profile yet)"])
      ));
    } catch (e) {
      setError(e.message || "Failed to load requests.");
    } finally { setLoading(false); }
  }, [tenant?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const closeAction = () => { setAction(null); setActiveId(null); setProposed(""); setNote(""); };

  const submitAction = async () => {
    if (!activeId || !action) return;
    setBusy(true);
    setError("");
    let result;
    if (action === "confirm") {
      if (!proposed) { setError("Pick a date/time."); setBusy(false); return; }
      result = await confirmRequest(activeId, new Date(proposed).toISOString(), note);
    } else if (action === "counter") {
      if (!proposed) { setError("Pick a date/time."); setBusy(false); return; }
      result = await counterPropose(activeId, new Date(proposed).toISOString(), note);
    } else if (action === "decline") {
      result = await declineRequest(activeId, note);
    }
    setBusy(false);
    if (result?.error) { setError(result.error.message || "Failed."); return; }
    closeAction();
    refresh();
  };

  const visible = requests.filter((r) =>
    filter === "all" ? true : (r.status === "requested" || r.status === "counter_proposed")
  );

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20, fontFamily: "'Outfit', sans-serif", color: t.text }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Appointment requests</h1>
        <p style={{ fontSize: 12, color: t.textSec, margin: "0 0 16px" }}>Confirm, propose a different time, or decline.</p>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {FILTER_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
              padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontSize: 13,
              border: `1px solid ${filter === tab.key ? t.accent : t.border}`,
              background: filter === tab.key ? `${t.accent}15` : "transparent",
              color: filter === tab.key ? t.accent : t.text,
              fontWeight: filter === tab.key ? 600 : 500,
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <div style={{ fontSize: 13, color: t.textMut }}>Loading...</div>}
        {error && <div style={{ fontSize: 13, color: "#dc2626", marginBottom: 10 }}>{error}</div>}

        {!loading && visible.length === 0 && (
          <div style={{ fontSize: 13, color: t.textSec, padding: 20, textAlign: "center",
            background: t.bgCard, border: `1px dashed ${t.border}`, borderRadius: 12 }}>
            {filter === "open" ? "No open requests." : "No requests yet."}
          </div>
        )}

        {visible.map((r) => {
          const status = STATUS_LABEL[r.status] || { text: r.status, color: t.textMut };
          const isOpen = r.status === "requested" || r.status === "counter_proposed";
          return (
            <div key={r.id} style={{
              padding: 14, marginBottom: 10, borderRadius: 12,
              background: t.bgCard, border: `1px solid ${t.border}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{namesById[r.patient_user_id] || "Patient"}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: status.color }}>{status.text}</div>
              </div>
              <div style={{ fontSize: 12, color: t.textSec, marginTop: 4 }}>
                Prefers {new Date(r.preferred_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                {" "}({r.preferred_window}) · {r.urgency.replace("_", " ")}
              </div>
              {r.proposed_at && (
                <div style={{ fontSize: 12, color: t.text, marginTop: 4 }}>
                  Proposed: {new Date(r.proposed_at).toLocaleString()}
                </div>
              )}
              <div style={{ fontSize: 12, color: t.text, marginTop: 6 }}>{r.reason}</div>
              {r.provider_note && (
                <div style={{ fontSize: 11, color: t.textSec, marginTop: 4, fontStyle: "italic" }}>
                  Note: "{r.provider_note}"
                </div>
              )}

              {isOpen && (
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                  <ActionBtn t={t} primary label="Confirm" onClick={() => {
                    const seed = `${r.preferred_date}T${r.preferred_window === "morning" ? "09:00" : r.preferred_window === "afternoon" ? "14:00" : "18:00"}`;
                    setActiveId(r.id); setAction("confirm"); setProposed(seed); setNote("");
                  }} />
                  <ActionBtn t={t} label="Propose time" onClick={() => {
                    setActiveId(r.id); setAction("counter"); setProposed(""); setNote("");
                  }} />
                  <ActionBtn t={t} label="Decline" onClick={() => {
                    setActiveId(r.id); setAction("decline"); setProposed(""); setNote("");
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {action && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }} onClick={closeAction}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: "100%", maxWidth: 480, background: t.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
            padding: 20, fontFamily: "'Outfit', sans-serif",
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: t.text }}>
              {action === "confirm" && "Confirm appointment"}
              {action === "counter" && "Propose a different time"}
              {action === "decline" && "Decline request"}
            </h2>
            {(action === "confirm" || action === "counter") && (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: t.textSec, display: "block", marginBottom: 4 }}>Date and time</label>
                <input type="datetime-local" value={proposed} onChange={(e) => setProposed(e.target.value)} style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  border: `1px solid ${t.border}`, background: t.bgCard, color: t.text,
                  fontSize: 14, boxSizing: "border-box", marginBottom: 12,
                }} />
              </>
            )}
            <label style={{ fontSize: 12, fontWeight: 600, color: t.textSec, display: "block", marginBottom: 4 }}>
              Note to patient {action === "decline" ? "" : "(optional)"}
            </label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={3} style={{
              width: "100%", padding: "12px 14px", borderRadius: 10,
              border: `1px solid ${t.border}`, background: t.bgCard, color: t.text,
              fontSize: 14, boxSizing: "border-box", resize: "vertical", marginBottom: 12,
            }} />

            {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 8 }}>{error}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={closeAction} disabled={busy} style={{
                flex: 1, padding: "12px", borderRadius: 12, border: `1px solid ${t.border}`,
                background: "transparent", color: t.text, fontSize: 14, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={submitAction} disabled={busy} style={{
                flex: 1, padding: "12px", borderRadius: 12, border: "none",
                background: action === "decline" ? "#dc2626" : t.accent, color: "#fff",
                fontSize: 14, fontWeight: 600, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1,
              }}>{busy ? "Saving..." : "Send"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function ActionBtn({ t, primary, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
      border: primary ? "none" : `1px solid ${t.border}`,
      background: primary ? t.accent : "transparent",
      color: primary ? "#fff" : t.text, cursor: "pointer",
    }}>{label}</button>
  );
}
