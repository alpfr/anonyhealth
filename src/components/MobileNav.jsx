import { T, Icons } from "../constants/theme";

export const MobileNav = ({ theme, title, onBack, rightAction }) => {
  const t = T[theme];
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
          {onBack ? "" : ""}<span style={{ color: t.accent }}>Anony</span>Health
        </span>
      </div>
      {rightAction || (
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          {Icons.menu(t.textSec)}
        </button>
      )}
    </div>
  );
};
