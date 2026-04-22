import { useState } from "react";
import { supabase } from "../supabaseClient";
import { T, Icons } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";
import { Toggle } from "../components/Toggle";
import { logAuditEvent } from "../utils/audit";
import { useTenant } from "../context/TenantContext";
import { callFunction } from "../utils/functions";

// ═══════════════════════════════════════════════════════════
// SCREEN: SETTINGS (MOBILE)
// ═══════════════════════════════════════════════════════════
const SettingsRow = ({ icon, label, desc, right, border = true, t }) => (
  <div style={{
    padding: "16px 0", borderBottom: border ? `1px solid ${t.border}` : "none",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  }}>
    <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: t.chipBg,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: "'Outfit', sans-serif" }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: t.textMut, fontFamily: "'Outfit', sans-serif", marginTop: 1 }}>{desc}</div>}
      </div>
    </div>
    {right}
  </div>
);

export const SettingsMobile = ({ theme, onBack, session, onNavigate }) => {
  const t = T[theme];
  const { isDoctor } = useTenant();
  const [notifs, setNotifs] = useState(true);
  const [updates, setUpdates] = useState(false);
  const [anon, setAnon] = useState(true);
  const [billingBusy, setBillingBusy] = useState(false);

  const handleSignOut = async () => {
    await logAuditEvent("auth.sign_out", "User signed out");
    await supabase.auth.signOut();
    onBack();
  };

  const openBillingPortal = async () => {
    setBillingBusy(true);
    try {
      const { url } = await callFunction("stripe-portal", {});
      window.location.href = url;
    } catch (e) {
      alert(e.message || "Unable to open billing portal");
      setBillingBusy(false);
    }
  };

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28,
          fontWeight: 400, color: t.text, margin: "0 0 4px", letterSpacing: "-0.02em",
        }}>
          Settings
        </h1>
        <p style={{ fontSize: 13, color: t.textSec, fontFamily: "'Outfit', sans-serif", margin: "0 0 24px" }}>
          Manage your account and privacy
        </p>

        {/* Account */}
        <div style={{
          padding: "4px 20px 0", borderRadius: 16, background: t.bgCard,
          border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: t.textMut, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", padding: "14px 0 4px" }}>Account</h3>
          {session ? (
            <>
              <SettingsRow t={t} icon={Icons.mail(t.accent)} label="Email" desc={session.user.email} right={Icons.chevRight(t.textMut)} />
              {isDoctor && (
                <div onClick={openBillingPortal} style={{ padding: "16px 0", borderTop: `1px solid ${t.border}`, cursor: billingBusy ? "wait" : "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: billingBusy ? 0.6 : 1 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: t.chipBg, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icons.shield(t.accent, 16)}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: "'Outfit', sans-serif" }}>Manage billing</div>
                      <div style={{ fontSize: 12, color: t.textMut, fontFamily: "'Outfit', sans-serif", marginTop: 1 }}>Update card, cancel, or view invoices</div>
                    </div>
                  </div>
                  {Icons.chevRight(t.textMut)}
                </div>
              )}
              <button onClick={handleSignOut} style={{
                width: "100%", padding: "16px 0", border: "none", background: "none", cursor: "pointer",
                borderTop: `1px solid ${t.border}`, color: t.danger, fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                Sign Out
              </button>
            </>
          ) : (
            <div onClick={() => onNavigate("register")} style={{ padding: "16px 0", borderTop: `1px solid ${t.border}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: t.chipBg, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icons.user(t.accent)}</div>
                <div style={{ fontSize: 14, color: t.accent, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>Sign In / Register</div>
              </div>
              {Icons.chevRight(t.accent)}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div style={{
          padding: "4px 20px 0", borderRadius: 16, background: t.bgCard,
          border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: t.textMut, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", padding: "14px 0 4px" }}>Notifications</h3>
          <SettingsRow t={t} icon={Icons.bell(t.accent)} label="Appointment reminders" right={<Toggle active={notifs} theme={theme} onChange={() => setNotifs(!notifs)} />} />
          <SettingsRow t={t} icon={Icons.bell(t.textMut)} label="Updates and news" right={<Toggle active={updates} theme={theme} onChange={() => setUpdates(!updates)} />} border={false} />
        </div>

        {/* Privacy */}
        <div style={{
          padding: "4px 20px 0", borderRadius: 16, background: t.bgCard,
          border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: t.textMut, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", padding: "14px 0 4px" }}>Privacy</h3>
          <SettingsRow t={t} icon={Icons.eyeOff(t.accent)} label="Anonymize patient activity" desc="Your identity will be reserved from matching providers" right={<Toggle active={anon} theme={theme} onChange={() => setAnon(!anon)} />} />
          <SettingsRow t={t} icon={Icons.database(t.accent)} label="Data Management" right={Icons.chevRight(t.textMut)} border={false} />
        </div>

        {/* Support */}
        <div style={{
          padding: "4px 20px 0", borderRadius: 16, background: t.bgCard,
          border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: t.textMut, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", padding: "14px 0 4px" }}>Support</h3>
          <div onClick={() => onNavigate("about")} style={{ cursor: "pointer" }}>
            <SettingsRow t={t} icon={Icons.circle(t.accent)} label="About AnonyHealth" desc="v1.0.2 • Confidential" right={Icons.chevRight(t.textMut)} border={false} />
          </div>
        </div>
      </div>
    </>
  );
};
