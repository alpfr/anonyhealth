import { useEffect, useState } from "react";
import { useTenant } from "../context/TenantContext";
import { T } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";
import { getPatientHistory } from "../services/doctor";

function severityColor(sev) {
  if (sev == null) return "#64748b";
  if (sev >= 7) return "#dc2626";
  if (sev >= 4) return "#d97706";
  return "#16a34a";
}

export const PatientDetailMobile = ({ theme, patientUserId, onBack, onMessage }) => {
  const t = T[theme];
  const { tenant } = useTenant();
  const [state, setState] = useState({ loading: true, profile: null, logs: [], error: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getPatientHistory(tenant.id, patientUserId);
        if (!cancelled) setState({ loading: false, ...res, error: "" });
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: e.message || "Failed to load patient" }));
      }
    })();
    return () => { cancelled = true; };
  }, [tenant?.id, patientUserId]);

  const { loading, profile, logs, error } = state;

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20, fontFamily: "'Outfit', sans-serif", color: t.text }}>
        {loading && <div style={{ fontSize: 13, color: t.textMut }}>Loading...</div>}
        {error && <div style={{ fontSize: 13, color: "#dc2626" }}>{error}</div>}

        {profile && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{profile.full_name}</h1>
            <div style={{ fontSize: 12, color: t.textSec, marginTop: 4 }}>
              DOB {new Date(profile.dob).toLocaleDateString()} · {profile.address}
            </div>
          </>
        )}

        {!loading && !error && !profile && (
          <div style={{ fontSize: 13, color: t.textSec }}>Patient has not completed profile yet.</div>
        )}

        {onMessage && (
          <button onClick={onMessage} style={{
            marginTop: 16, padding: "10px 16px", borderRadius: 12, border: "none",
            background: t.accent, color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Outfit', sans-serif",
          }}>
            Message patient
          </button>
        )}

        <h2 style={{ fontSize: 13, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.06em", margin: "24px 0 10px" }}>
          Triage history {logs.length > 0 && `(${logs.length})`}
        </h2>

        {!loading && logs.length === 0 && (
          <div style={{ fontSize: 13, color: t.textSec }}>No triage entries yet.</div>
        )}

        {logs.map((log) => (
          <div key={log.id} style={{
            padding: 14, marginBottom: 8, borderRadius: 12,
            background: t.bgCard, border: `1px solid ${t.border}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{log.symptom || "(no summary)"}</div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "#fff",
                background: severityColor(log.severity),
                padding: "2px 8px", borderRadius: 999,
              }}>
                {log.severity != null ? `sev ${log.severity}` : "—"}
              </div>
            </div>
            <div style={{ fontSize: 11, color: t.textMut, marginTop: 4 }}>
              {new Date(log.created_at).toLocaleString()}
            </div>
            {log.ai_advice && (
              <div style={{ fontSize: 13, color: t.textSec, marginTop: 8, lineHeight: 1.4 }}>
                {log.ai_advice}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};
