import { T, Icons } from "../constants/theme";
import { ProfileMenu } from "./ProfileMenu";

/**
 * MobileNav — top bar shown above mobile screens.
 *
 * Right side defaults to a ProfileMenu showing the current identity tier and
 * tier-appropriate actions (Save session / Start fresh / Sign out).
 *
 * Callers can override `rightAction` for screen-specific affordances (e.g.
 * an Encrypted indicator on the AI chat). Pass `hideProfile` to omit the
 * profile menu without supplying a replacement (rare).
 */
export const MobileNav = ({ theme, onBack, rightAction, hideProfile, onNavigate }) => {
  const t = T[theme];

  let right;
  if (rightAction !== undefined) {
    right = rightAction;
  } else if (hideProfile) {
    right = null;
  } else {
    right = <ProfileMenu theme={theme} onNavigate={onNavigate} />;
  }

  return (
    <div style={{
      height: 48, padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: `1px solid ${t.border}`, flexShrink: 0, background: t.bgNav, backdropFilter: "blur(20px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onBack ? (
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            {Icons.chevLeft(t.accent)}
          </button>
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: t.gradient,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {Icons.shield("#fff", 15)}
          </div>
        )}
        <span style={{
          fontSize: 16, fontWeight: 700, color: t.text,
          fontFamily: "'Outfit', -apple-system, sans-serif",
        }}>
          <span style={{ color: t.accent }}>Anony</span>Health
        </span>
      </div>
      {right}
    </div>
  );
};
