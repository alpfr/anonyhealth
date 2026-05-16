import { useEffect, useState } from "react";
import { T, Icons } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";
import { useTenant } from "../context/TenantContext";
import { fetchHealthLogs } from "../services/healthLogs";
import { getProviderProfile } from "../services/providerProfile";
import { useAuth } from "../context/AuthContext";
import { extractInviteToken, goToInvite } from "../utils/inviteToken";

// ═══════════════════════════════════════════════════════════
// SCREEN: PATIENT DASHBOARD (MOBILE)
// Shows the patient's provider (or anonymous welcome card), an AI Chat
// entry point, and recent triage entries.
//
// Three identity tiers render different top cards:
//   • Anonymous    → Privacy-first welcome card
//   • Patient w/ provider → Provider banner (existing behavior)
//   • Patient w/o provider → Awaiting-provider state
// ═══════════════════════════════════════════════════════════
export const PatientDashboard = ({ theme, onNavigate }) => {
  const t = T[theme];
  const { tenant } = useTenant();
  const { session, isAnonymous } = useAuth();
  const [activityInput, setActivityInput] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providerProfile, setProviderProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const userId = session?.user?.id;
    if (!userId) {
      queueMicrotask(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }
    fetchHealthLogs(userId, 5).then(({ data }) => {
      if (!cancelled) { setLogs(data || []); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    // Anonymous users have no tenant — skip the provider lookup entirely.
    // Without this, the "Loading..." state would never resolve.
    if (isAnonymous || !tenant?.id) return;
    getProviderProfile(tenant.id)
      .then((row) => { if (!cancelled) setProviderProfile(row); })
      .catch(() => { /* non-fatal — banner falls back to tenant.name */ });
    return () => { cancelled = true; };
  }, [tenant?.id, isAnonymous]);

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

        {/* ─── Top card ─── tier-aware */}
        {isAnonymous ? (
          // Anonymous user: privacy-first welcome with subtle upgrade nudge.
          // No "Your provider / Loading..." card, no Book Appointment button
          // (booking requires a real account with a tenant).
          <div style={{
            padding: 18, borderRadius: 14, background: t.bgCard,
            border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 24,
            display: "flex", gap: 14, alignItems: "flex-start",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: t.gradient,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {Icons.shield("#fff", 20)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: t.accent, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                Anonymous session
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: "'Instrument Serif', Georgia, serif", marginTop: 2, letterSpacing: "-0.01em" }}>
                Talk to AI triage, privately.
              </div>
              <div style={{ fontSize: 13, color: t.textSec, fontFamily: "'Outfit', sans-serif", marginTop: 6, lineHeight: 1.5 }}>
                No account needed to start. Save your session when you're ready to book an appointment or message a provider.
              </div>
              <button
                onClick={() => { window.location.href = "/signup"; }}
                style={{
                  marginTop: 10, padding: "8px 14px", borderRadius: 10,
                  border: "none", background: t.accent, color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Save my session →
              </button>
            </div>
          </div>
        ) : tenant?.id ? (
          // Patient with provider tenant: existing provider banner.
          <div style={{
            padding: 16, borderRadius: 14, background: t.bgCard,
            border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 24,
            display: "flex", gap: 14, alignItems: "flex-start",
          }}>
            {providerProfile?.avatar_url ? (
              <img src={providerProfile.avatar_url} alt=""
                style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: t.gradient,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                color: "#fff", fontWeight: 700, fontSize: 18,
              }}>
                {(providerProfile?.display_name || tenant?.name || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                Your provider
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", marginTop: 2 }}>
                {providerProfile?.display_name || tenant?.name || "Loading..."}
                {providerProfile?.credentials && (
                  <span style={{ fontSize: 13, fontWeight: 500, color: t.textSec, marginLeft: 6 }}>
                    {providerProfile.credentials}
                  </span>
                )}
              </div>
              {providerProfile?.specialty && (
                <div style={{ fontSize: 12, color: t.accent, fontFamily: "'Outfit', sans-serif", marginTop: 2, fontWeight: 600 }}>
                  {providerProfile.specialty}
                </div>
              )}
              {providerProfile?.bio && (
                <div style={{ fontSize: 12, color: t.textSec, fontFamily: "'Outfit', sans-serif", marginTop: 6, lineHeight: 1.5 }}>
                  {providerProfile.bio}
                </div>
              )}
              {providerProfile?.scheduling_url ? (
                <a
                  href={/^https?:\/\//i.test(providerProfile.scheduling_url)
                    ? providerProfile.scheduling_url
                    : `https://${providerProfile.scheduling_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block", marginTop: 10, padding: "8px 14px", borderRadius: 10,
                    background: t.accent, color: "#fff",
                    fontSize: 13, fontWeight: 600, textDecoration: "none",
                  }}
                >
                  Book appointment →
                </a>
              ) : (
                <button
                  onClick={() => onNavigate("book")}
                  style={{
                    marginTop: 10, padding: "8px 14px", borderRadius: 10,
                    border: "none", background: t.accent, color: "#fff",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Book appointment →
                </button>
              )}
            </div>
          </div>
        ) : (
          // Patient signed in but no tenant yet — likely upgraded from
          // anonymous without an invite. Offer a way to redeem an invite
          // right here so they can complete onboarding.
          <OrphanPatientCard theme={theme} />
        )}

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

// ─────────────────────────────────────────────────────────
// OrphanPatientCard — shown when a patient is signed in but has no tenant
// connection. Lets them redeem an invite link without leaving the dashboard.
// ─────────────────────────────────────────────────────────
const OrphanPatientCard = ({ theme }) => {
  const t = T[theme];
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleUseInvite = () => {
    setError("");
    const token = extractInviteToken(input);
    if (!token) {
      setError("That doesn't look like a valid invite link.");
      return;
    }
    goToInvite(token);
  };

  return (
    <div style={{
      padding: 18, borderRadius: 14, background: t.bgCard,
      border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 24,
    }}>
      <div style={{
        fontSize: 11, color: t.accent, textTransform: "uppercase",
        letterSpacing: "0.06em", fontWeight: 700, marginBottom: 6,
      }}>
        Connect with a provider
      </div>
      <div style={{
        fontSize: 14, fontWeight: 600, color: t.text,
        fontFamily: "'Outfit', sans-serif", marginBottom: 6,
      }}>
        You're signed in, but not yet connected to a provider
      </div>
      <div style={{
        fontSize: 12.5, color: t.textSec, fontFamily: "'Outfit', sans-serif",
        marginBottom: 12, lineHeight: 1.5,
      }}>
        Patients connect through an invite link from their provider. If you have one, paste it below to finish setup.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUseInvite()}
          placeholder="Paste invite link"
          style={{
            flex: 1, padding: "10px 12px", borderRadius: 10,
            border: `1px solid ${t.border}`, background: t.bgInput, color: t.text,
            outline: "none", fontSize: 13, fontFamily: "'Outfit', sans-serif",
          }}
        />
        <button
          onClick={handleUseInvite}
          disabled={!input.trim()}
          style={{
            padding: "10px 16px", borderRadius: 10, border: "none",
            background: input.trim() ? t.accent : t.textMut,
            color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: input.trim() ? "pointer" : "default",
            fontFamily: "'Outfit', sans-serif",
            opacity: input.trim() ? 1 : 0.5,
          }}
        >
          Use
        </button>
      </div>
      {error && (
        <div role="alert" style={{
          fontSize: 12, color: "#ef4444", marginTop: 8,
          fontFamily: "'Outfit', sans-serif",
        }}>
          {error}
        </div>
      )}
    </div>
  );
};
