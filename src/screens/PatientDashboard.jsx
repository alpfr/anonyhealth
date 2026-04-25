import { useEffect, useState } from "react";
import { T, Icons } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";
import { useTenant } from "../context/TenantContext";
import { fetchHealthLogs } from "../services/healthLogs";
import { useAuth } from "../context/AuthContext";

// ═══════════════════════════════════════════════════════════
// SCREEN: PATIENT DASHBOARD (MOBILE)
// Shows the patient's provider, an AI Chat entry point, and the most
// recent triage entries. Patients in this multi-tenant model only
// interact with the one provider whose invite they accepted.
// ═══════════════════════════════════════════════════════════
export const PatientDashboard = ({ theme, onNavigate }) => {
  const t = T[theme];
  const { tenant } = useTenant();
  const { session } = useAuth();
  const [activityInput, setActivityInput] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const userId = session?.user?.id;
    if (!userId) {
      // No session — render the empty state. (Effects shouldn't setState
      // synchronously; queue it.)
      queueMicrotask(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }
    fetchHealthLogs(userId, 5).then(({ data }) => {
      if (!cancelled) { setLogs(data || []); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const handleActivitySubmit = (e) => {
    if (e.key === "Enter" && activityInput.trim()) {
      onNavigate("chat", activityInput);
      setActivityInput("");
    }
  };

  const severityColor = (sev) => {
    if (sev == null) return t.textMut;
    if (sev >= 7) return "#dc2626";
    if (sev >= 4) return "#d97706";
    return "#16a34a";
  };

  return (
    <>
      <MobileNav theme={theme} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* Provider banner */}
        <div style={{
          padding: 16, borderRadius: 14, background: t.bgCard,
          border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 24,
        }}>
          <div style={{ fontSize: 11, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            Your provider
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", marginTop: 4 }}>
            {tenant?.name || "Loading..."}
          </div>
          <div style={{ fontSize: 12, color: t.textSec, fontFamily: "'Outfit', sans-serif", marginTop: 4 }}>
            All triage and history is shared confidentially with your provider's practice.
          </div>
        </div>

        {/* AI Triage entry */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", margin: "0 0 12px" }}>
            Talk to AI Triage
          </h2>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
            borderRadius: 12, background: t.bgCard, border: `1px solid ${t.border}`, boxShadow: t.shadow,
          }}>
            {Icons.search(t.textMut, 16)}
            <input
              value={activityInput}
              onChange={(e) => setActivityInput(e.target.value)}
              onKeyDown={handleActivitySubmit}
              placeholder="Describe how you're feeling..."
              style={{
                border: "none", background: "transparent", outline: "none", flex: 1,
                fontSize: 14, color: t.text, fontFamily: "'Outfit', sans-serif",
              }}
            />
            <button onClick={() => onNavigate("chat")} style={{
              border: "none", background: "none", cursor: "pointer",
              color: t.accent, fontSize: 12, fontWeight: 700, fontFamily: "'Outfit', sans-serif",
            }}>OPEN</button>
          </div>
        </div>

        {/* Recent triage */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", margin: 0 }}>
              Recent triage
            </h2>
            {logs.length > 0 && (
              <button onClick={() => onNavigate("history")} style={{
                background: "none", border: "none", color: t.accent, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>View all</button>
            )}
          </div>

          {loading && <div style={{ fontSize: 13, color: t.textMut }}>Loading...</div>}

          {!loading && logs.length === 0 && (
            <div style={{
              padding: 18, borderRadius: 14, background: t.bgCard,
              border: `1px dashed ${t.border}`, fontSize: 13, color: t.textSec, textAlign: "center",
            }}>
              No triage entries yet. Use the chat above to start a session.
            </div>
          )}

          {!loading && logs.map((log) => (
            <div key={log.id} style={{
              padding: 14, marginBottom: 8, borderRadius: 12, background: t.bgCard,
              border: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.symptom || "(triage session)"}
                </div>
                <div style={{ fontSize: 11, color: t.textMut, marginTop: 2 }}>
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
              {log.severity != null && (
                <div style={{
                  fontSize: 11, fontWeight: 700, color: "#fff",
                  background: severityColor(log.severity),
                  padding: "2px 8px", borderRadius: 999, marginLeft: 12,
                }}>
                  sev {log.severity}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Settings */}
        <div onClick={() => onNavigate("settings")} style={{
          padding: 18, borderRadius: 14, background: t.bgCard, border: `1px solid ${t.border}`,
          boxShadow: t.shadow, display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer",
        }}>
          <span style={{ fontSize: 14, color: t.textSec, fontFamily: "'Outfit', sans-serif" }}>
            Settings
          </span>
          {Icons.chevRight(t.textMut)}
        </div>
      </div>
    </>
  );
};
