import { T, Icons } from "../constants/theme";

export const FilterChip = ({ label, theme, active }) => {
  const t = T[theme];
  return (
    <button style={{
      padding: "7px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 500,
      fontFamily: "'Outfit', sans-serif", cursor: "pointer", whiteSpace: "nowrap",
      background: active ? t.accentLight : t.chipBg,
      color: active ? t.accent : t.chipText,
      border: `1px solid ${active ? t.accent + "30" : t.border}`,
      display: "flex", alignItems: "center", gap: 4, transition: "all 0.2s",
    }}>
      {label} {Icons.chevDown(active ? t.accent : t.textMut, 12)}
    </button>
  );
};
