import { T } from "../constants/theme";

export const Toggle = ({ active, theme, onChange }) => {
  const t = T[theme];
  return (
    <button onClick={onChange} style={{
      width: 48, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
      background: active ? t.toggleActive : t.toggleBg, position: "relative",
      transition: "all 0.3s", padding: 0,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 11, background: "#fff",
        position: "absolute", top: 3,
        left: active ? 23 : 3, transition: "left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
};
