import { useState } from "react";
import { T, Icons } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";

// ═══════════════════════════════════════════════════════════
// SCREEN: PATIENT DASHBOARD (MOBILE)
// ═══════════════════════════════════════════════════════════
export const PatientDashboard = ({ theme, onNavigate }) => {
  const t = T[theme];
  const [activityInput, setActivityInput] = useState("");

  const handleActivitySubmit = (e) => {
    if (e.key === "Enter" && activityInput.trim()) {
      onNavigate("chat", activityInput);
      setActivityInput("");
    }
  };

  return (
    <>
      <MobileNav theme={theme} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 30,
          fontWeight: 400, color: t.text, margin: "0 0 24px", letterSpacing: "-0.02em",
        }}>
          Patient Dashboard
        </h1>

        {/* Anonymous Activity */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", margin: "0 0 12px" }}>
            Confidential Activity
          </h2>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
            borderRadius: 12, background: t.bgCard, border: `1px solid ${t.border}`,
            boxShadow: t.shadow,
          }}>
            {Icons.search(t.textMut, 16)}
            <input
              value={activityInput}
              onChange={(e) => setActivityInput(e.target.value)}
              onKeyDown={handleActivitySubmit}
              placeholder="Tell us what's on your mind..."
              style={{
                border: "none", background: "transparent", outline: "none", flex: 1,
                fontSize: 14, color: t.text, fontFamily: "'Outfit', sans-serif",
              }}
            />
            <button onClick={() => onNavigate("history")} style={{
              border: "none", background: "none", cursor: "pointer", color: t.accent, fontSize: 12, fontWeight: 600
            }}>
              HISTORY
            </button>
          </div>
        </div>

        {/* Triage Results */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", margin: "0 0 12px" }}>
            Triage Results
          </h2>
          <div style={{
            padding: 18, borderRadius: 14, background: t.bgCard, border: `1px solid ${t.border}`,
            boxShadow: t.shadow, cursor: "pointer",
          }} onClick={() => onNavigate("chat")}>
            <div style={{ fontSize: 17, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>
              Sore Throat
            </div>
            <div style={{
              display: "inline-flex", padding: "4px 12px", borderRadius: 8,
              background: t.urgentBg, border: `1px solid ${t.urgentBorder}`,
              fontSize: 12, fontWeight: 700, color: t.urgentText, fontFamily: "'Outfit', sans-serif",
              marginBottom: 8,
            }}>
              Urgent
            </div>
            <div style={{ fontSize: 13.5, color: t.textSec, fontFamily: "'Outfit', sans-serif", lineHeight: 1.5 }}>
              You may require medical attention.
            </div>
          </div>
        </div>

        {/* Appointments */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", margin: "0 0 12px" }}>
            Appointments
          </h2>
          <div style={{
            padding: 18, borderRadius: 14, background: t.bgCard, border: `1px solid ${t.border}`,
            boxShadow: t.shadow, display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif" }}>Karen Taylor, MD</div>
              <div style={{ fontSize: 12.5, color: t.textSec, fontFamily: "'Outfit', sans-serif", marginTop: 2 }}>Telehealth</div>
              <div style={{
                display: "inline-flex", padding: "3px 10px", borderRadius: 6,
                background: t.accentLight, fontSize: 12, fontWeight: 600,
                color: t.accent, fontFamily: "'Outfit', sans-serif", marginTop: 6,
              }}>
                9:00 AM
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, color: t.textSec, fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>March 7, 2024</div>
              <button style={{
                padding: "8px 20px", borderRadius: 10, border: "none", cursor: "pointer",
                background: t.gradient, color: "#fff", fontSize: 13, fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
              }}>View</button>
            </div>
          </div>
        </div>

        {/* Privacy & Settings */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", margin: "0 0 12px" }}>
            Privacy & Settings
          </h2>
          <div onClick={() => onNavigate("settings")} style={{
            padding: 18, borderRadius: 14, background: t.bgCard, border: `1px solid ${t.border}`,
            boxShadow: t.shadow, display: "flex", justifyContent: "space-between", alignItems: "center",
            cursor: "pointer",
          }}>
            <span style={{ fontSize: 14, color: t.textSec, fontFamily: "'Outfit', sans-serif" }}>
              Manage preferences, notifications, and data
            </span>
            {Icons.chevRight(t.textMut)}
          </div>
        </div>
      </div>
    </>
  );
};
