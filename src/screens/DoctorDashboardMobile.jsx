import { useCallback, useEffect, useState } from "react";
import { useTenant } from "../context/TenantContext";
import { T } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";
import { callFunction } from "../utils/functions";
import { listTenantPatients } from "../services/doctor";

export const DoctorDashboardMobile = ({ theme, onOpenPatient, onOpenSettings, onOpenAppointments }) => {
  const t = T[theme];
  const { tenant, subscription } = useTenant();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      setPatients(await listTenantPatients(tenant.id));
      setError("");
    } catch (e) {
      setError(e.message || "Failed to load patients.");
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => { load(); }, [load]);

  const generateInvite = async () => {
    setGenerating(true);
    setCopied(false);
    try {
      const { url } = await callFunction("create-patient-invite", {});
      setInviteUrl(url);
    } catch (e) {
      alert(e.message || "Failed to generate invite");
    } finally {
      setGenerating(false);
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may be unavailable on http */ }
  };

  return (
    <>
      <MobileNav theme={theme} rightAction={
        <button onClick={onOpenSettings} style={{ background: "none", border: "none", cursor: "pointer", color: t.text, fontSize: 13 }}>Settings</button>
      } />
      <div style={{ flex: 1, overflowY: "auto", padding: 20, fontFamily: "'Outfit', sans-serif", color: t.text }}>
        <div style={{ fontSize: 12, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.06em" }}>Practice</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "4px 0 2px" }}>{tenant?.name || "Your practice"}</h1>
        <p style={{ fontSize: 12, color: t.textSec, margin: 0 }}>
          Subscription: {subscription?.status ?? "—"}
          {subscription?.trial_end && ` · trial ends ${new Date(subscription.trial_end).toLocaleDateString()}`}
        </p>

        {/* Jev Clinical Safety Engine Status */}
        <div style={{
          marginTop: 12, padding: "8px 12px", borderRadius: 10,
          background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🛡️</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>Jev Clinical Safety Guard Active</div>
              <div style={{ fontSize: 10, color: t.textMut }}>0ms Emergency Intercept · Zero-Knowledge PII Redaction</div>
            </div>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#10b981", background: "rgba(16, 185, 129, 0.15)", padding: "2px 6px", borderRadius: 4 }}>
            SYSTEM 1
          </span>
        </div>

        <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: t.bgCard, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Invite a patient</div>
          <div style={{ fontSize: 12, color: t.textSec, marginTop: 4 }}>
            Share a single-use link. Valid for 7 days.
          </div>
          {!inviteUrl ? (
            <button onClick={generateInvite} disabled={generating} style={{
              marginTop: 10, padding: "10px 14px", borderRadius: 10, border: "none",
              background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: generating ? "wait" : "pointer",
            }}>
              {generating ? "Generating..." : "Generate invite link"}
            </button>
          ) : (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: t.textMut, wordBreak: "break-all", padding: 10, background: t.bgNav, borderRadius: 8 }}>
                {inviteUrl}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button onClick={copyInvite} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${t.border}`, background: "transparent", color: t.text, cursor: "pointer", fontSize: 13 }}>
                  {copied ? "Copied!" : "Copy link"}
                </button>
                <button onClick={() => setInviteUrl("")} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${t.border}`, background: "transparent", color: t.text, cursor: "pointer", fontSize: 13 }}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        <div onClick={onOpenAppointments} style={{
          marginTop: 12, padding: 14, borderRadius: 12, cursor: "pointer",
          background: t.bgCard, border: `1px solid ${t.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Appointment requests</div>
            <div style={{ fontSize: 12, color: t.textSec, marginTop: 2 }}>Confirm or propose times</div>
          </div>
          <div style={{ fontSize: 18, color: t.textMut }}>›</div>
        </div>

        <h2 style={{ fontSize: 13, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.06em", margin: "24px 0 10px" }}>
          Patients {patients.length > 0 && `(${patients.length})`}
        </h2>

        {loading && <div style={{ fontSize: 13, color: t.textMut }}>Loading...</div>}
        {error && <div style={{ fontSize: 13, color: "#dc2626" }}>{error}</div>}

        {!loading && patients.length === 0 && !error && (
          <div style={{ fontSize: 13, color: t.textSec, padding: 20, textAlign: "center", background: t.bgCard, border: `1px dashed ${t.border}`, borderRadius: 12 }}>
            No patients yet. Send an invite to get started.
          </div>
        )}

        {patients.map((p) => {
          const profile = p.patient_profiles;
          return (
            <div key={p.user_id} onClick={() => onOpenPatient(p.user_id)} style={{
              padding: 14, marginBottom: 8, borderRadius: 12,
              background: t.bgCard, border: `1px solid ${t.border}`, cursor: "pointer",
            }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {profile?.full_name || "(No profile yet)"}
              </div>
              <div style={{ fontSize: 12, color: t.textSec, marginTop: 2 }}>
                Joined {new Date(p.created_at).toLocaleDateString()}
                {profile?.dob && ` · DOB ${new Date(profile.dob).toLocaleDateString()}`}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
