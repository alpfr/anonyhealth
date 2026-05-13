import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { T, Icons } from "../constants/theme";

/**
 * AnonymousBadge — persistent indicator that the current session is anonymous,
 * with a one-tap path to upgrade to a real account.
 *
 * Renders nothing when:
 *   • There's no session at all (auth gate hasn't bootstrapped yet)
 *   • The user is already signed in to a non-anonymous account
 *   • The caller passes `hide` (e.g. on screens where the badge would clutter)
 */
export const AnonymousBadge = ({ theme = "light", hide, onUpgrade }) => {
  const { isAnonymous, session } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const t = T[theme] || T.light;

  if (hide || dismissed) return null;
  if (!session || !isAnonymous) return null;

  return (
    <div
      role="status"
      aria-label="Anonymous session"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        margin: "12px 16px 0",
        borderRadius: 12,
        background: t.bgCard,
        border: `1px solid ${t.border}`,
        boxShadow: t.shadow,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: t.accentGlow,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {Icons.shield(t.accent, 16)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>
          You're anonymous
        </div>
        <div style={{ fontSize: 11.5, color: t.textMut, marginTop: 1 }}>
          No personal info collected. Save to keep your history.
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (onUpgrade) onUpgrade();
          else window.location.href = "/signup";
        }}
        style={{
          padding: "6px 14px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          background: t.accent,
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "'Outfit', sans-serif",
          flexShrink: 0,
        }}
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: t.textMut,
          fontSize: 18,
          padding: "0 4px",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
};
