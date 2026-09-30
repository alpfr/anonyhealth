import { useEffect, useState } from "react";
import { useTenant } from "../context/TenantContext";
import { T } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";
import { getPatientHistory } from "../services/doctor";
import { calculateJevRiskBand, getRiskBandTheme, generateSoapNote } from "../utils/jevReflex";

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
  const [copiedSoapId, setCopiedSoapId] = useState(null);
  const [viewSoapLog, setViewSoapLog] = useState(null);

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

  const handleCopySoap = async (log) => {
    try {
      const note = generateSoapNote(log, profile);
      await navigator.clipboard.writeText(note);
      setCopiedSoapId(log.id);
      setTimeout(() => setCopiedSoapId(null), 2500);
    } catch {
      alert("Clipboard access unavailable. Opening note view instead.");
      setViewSoapLog(log);
    }
  };

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

        {logs.map((log) => {
          const riskBand = log.risk_band || calculateJevRiskBand(log.severity, log.urgency);
          const riskTheme = getRiskBandTheme(riskBand);
          const isCopied = copiedSoapId === log.id;
          const isEmergency = riskBand === "CRITICAL" || log.decision_class === "CRITICAL_EMERGENCY_911";

          return (
            <div key={log.id} style={{
              padding: 14, marginBottom: 12, borderRadius: 14,
              background: t.bgCard, border: `1px solid ${isEmergency ? '#f87171' : t.border}`,
              boxShadow: isEmergency ? "0 0 12px rgba(220, 38, 38, 0.15)" : "none",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{log.symptom || "(no summary)"}</div>
                  <div style={{ fontSize: 11, color: t.textMut, marginTop: 2 }}>
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {/* Jev Clinical Risk HUD Badge */}
                  <div style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.05em",
                    color: riskTheme.text, background: riskTheme.bg,
                    border: `1px solid ${riskTheme.border}`,
                    padding: "3px 8px", borderRadius: 6,
                    textTransform: "uppercase",
                  }}>
                    JEV: {riskBand}
                  </div>

                  <div style={{
                    fontSize: 11, fontWeight: 700, color: "#fff",
                    background: severityColor(log.severity),
                    padding: "3px 8px", borderRadius: 999,
                  }}>
                    {log.severity != null ? `sev ${log.severity}` : "—"}
                  </div>
                </div>
              </div>

              {isEmergency && (
                <div style={{
                  marginTop: 8, padding: "6px 10px", borderRadius: 8,
                  background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(220, 38, 38, 0.2)",
                  fontSize: 11, color: "#ef4444", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span>🚨</span> System 1 Emergency Deflection Triggered
                </div>
              )}

              {log.ai_advice && (
                <div style={{ fontSize: 13, color: t.textSec, marginTop: 10, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                  {log.ai_advice}
                </div>
              )}

              {/* Clinical Workflow Tooling: SOAP Note Actions */}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${t.border}`, display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleCopySoap(log)}
                  style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${isCopied ? '#16a34a' : t.border}`,
                    background: isCopied ? "rgba(22, 163, 74, 0.1)" : "transparent",
                    color: isCopied ? "#16a34a" : t.text,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  {isCopied ? "✓ SOAP Note Copied" : "📋 Copy SOAP Note"}
                </button>

                <button
                  onClick={() => setViewSoapLog(log)}
                  style={{
                    padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`,
                    background: "transparent", color: t.textSec,
                    fontSize: 12, fontWeight: 500, cursor: "pointer",
                  }}
                >
                  Preview
                </button>
              </div>
            </div>
          );
        })}

        {/* SOAP Note Preview Modal */}
        {viewSoapLog && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}>
            <div style={{
              background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
              width: "100%", maxWidth: 540, maxHeight: "85vh", display: "flex", flexDirection: "column",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)", overflow: "hidden",
            }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Clinical SOAP Encounter Note</div>
                  <div style={{ fontSize: 11, color: t.textMut }}>Generated by Jev Clinical Engine</div>
                </div>
                <button
                  onClick={() => setViewSoapLog(null)}
                  style={{ background: "none", border: "none", color: t.textMut, fontSize: 20, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                <pre style={{
                  fontFamily: "monospace", fontSize: 11, lineHeight: 1.5,
                  color: t.text, background: t.bgNav, padding: 14, borderRadius: 10,
                  border: `1px solid ${t.border}`, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {generateSoapNote(viewSoapLog, profile)}
                </pre>
              </div>

              <div style={{ padding: 14, borderTop: `1px solid ${t.border}`, display: "flex", gap: 10 }}>
                <button
                  onClick={async () => {
                    await handleCopySoap(viewSoapLog);
                  }}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 10, border: "none",
                    background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {copiedSoapId === viewSoapLog.id ? "✓ Copied to Clipboard" : "Copy to Clipboard"}
                </button>
                <button
                  onClick={() => setViewSoapLog(null)}
                  style={{
                    padding: "10px 16px", borderRadius: 10, border: `1px solid ${t.border}`,
                    background: "transparent", color: t.text, fontSize: 13, cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
