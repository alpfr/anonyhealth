import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { T, Icons } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";

// ═══════════════════════════════════════════════════════════
// SCREEN: HEALTH HISTORY (MOBILE)
// ═══════════════════════════════════════════════════════════
export const HistoryMobile = ({ theme, onBack }) => {
  const t = T[theme];
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('health_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const severityColor = (sev) => {
    if (sev >= 7) return t.danger;
    if (sev >= 4) return t.warn;
    return t.success;
  };

  const severityLabel = (sev) => {
    if (sev >= 7) return "High";
    if (sev >= 4) return "Moderate";
    return "Low";
  };

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28,
          fontWeight: 400, color: t.text, margin: "0 0 6px", letterSpacing: "-0.02em",
        }}>
          Health History
        </h1>
        <p style={{ fontSize: 13, color: t.textSec, fontFamily: "'Outfit', sans-serif", margin: "0 0 24px" }}>
          Your previous triage sessions
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: t.textMut, fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>
            Loading...
          </div>
        ) : logs.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 40, borderRadius: 16, background: t.bgCard,
            border: `1px solid ${t.border}`, boxShadow: t.shadow,
          }}>
            <div style={{ marginBottom: 12 }}>{Icons.clock(t.textMut, 32)}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text, fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>
              No history yet
            </div>
            <div style={{ fontSize: 13, color: t.textMut, fontFamily: "'Outfit', sans-serif" }}>
              Your triage sessions will appear here after you chat with the AI assistant.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {logs.map((log) => (
              <div key={log.id} style={{
                padding: 16, borderRadius: 14, background: t.bgCard,
                border: `1px solid ${t.border}`, boxShadow: t.shadow,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif" }}>
                    {log.symptom || "Triage Session"}
                  </div>
                  {log.severity > 0 && (
                    <div style={{
                      padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                      fontFamily: "'Outfit', sans-serif",
                      background: `${severityColor(log.severity)}15`,
                      color: severityColor(log.severity),
                      border: `1px solid ${severityColor(log.severity)}30`,
                    }}>
                      {severityLabel(log.severity)} ({log.severity}/10)
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 13, color: t.textSec, fontFamily: "'Outfit', sans-serif",
                  lineHeight: 1.5, marginBottom: 8,
                }}>
                  {log.ai_advice && log.ai_advice.length > 120 ? log.ai_advice.slice(0, 120) + "..." : log.ai_advice}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: t.textMut, fontFamily: "'Outfit', sans-serif" }}>
                  {Icons.clock(t.textMut, 11)}
                  {new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
