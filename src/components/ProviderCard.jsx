import { T, Icons, Stars } from "../constants/theme";

export const ProviderCard = ({ prov, theme, onSelect, compact }) => {
  const t = T[theme];
  const isDark = theme === "dark";
  return (
    <div onClick={onSelect} style={{
      padding: compact ? 16 : 24, borderRadius: compact ? 14 : 18,
      background: t.bgCard, border: `1px solid ${t.border}`,
      boxShadow: t.shadow, cursor: "pointer", transition: "all 0.25s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: compact ? 16 : 18, fontWeight: 700, color: t.text,
            fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em",
          }}>{prov.name}</div>
          <div style={{
            fontSize: compact ? 12.5 : 13.5, color: t.textSec, marginTop: 2,
            fontFamily: "'Outfit', sans-serif",
          }}>{prov.specialty}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: compact ? 6 : 10, flexWrap: "wrap" }}>
            <Stars rating={prov.rating} color={t.star} />
            <span style={{ fontSize: 11.5, color: t.textMut, display: "flex", alignItems: "center", gap: 3 }}>
              {Icons.mapPin(t.textMut, 11)} {prov.distance}
            </span>
          </div>
          <div style={{ fontSize: 12, color: t.textSec, marginTop: 6, fontFamily: "'Outfit', sans-serif" }}>
            {prov.telehealth ? "Telehealth available" : prov.badge}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            borderRadius: 10, background: t.accentGlow, border: `1px solid ${t.accent}15`,
          }}>
            {Icons.shield(t.accent, 14)}
            <span style={{ fontSize: 11, fontWeight: 600, color: t.accent, fontFamily: "'Outfit', sans-serif", lineHeight: 1.2 }}>
              Confidential Pre-<br />Intake Available
            </span>
          </div>
          <button style={{
            padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer",
            background: t.gradient, color: "#fff", fontSize: 13, fontWeight: 600,
            fontFamily: "'Outfit', sans-serif",
            boxShadow: isDark ? `0 0 16px ${t.accent}25` : `0 2px 10px ${t.accent}20`,
          }}>
            Start Confidentially
          </button>
        </div>
      </div>
    </div>
  );
};
