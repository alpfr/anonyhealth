import { T, Icons } from "../constants/theme";

export const PhoneFrame = ({ children, theme }) => {
  const t = T[theme];
  return (
    <div style={{
      width: 390, height: 844, borderRadius: 52, overflow: "hidden",
      border: `8px solid ${theme === "dark" ? "#1a1a2e" : "#e0e0e0"}`,
      boxShadow: theme === "dark"
        ? "0 30px 80px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.05)"
        : "0 30px 80px rgba(0,0,0,0.15), inset 0 0 0 2px rgba(255,255,255,0.8)",
      background: t.bg, position: "relative", display: "flex", flexDirection: "column",
    }}>
      {/* Notch */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 160, height: 34, borderRadius: "0 0 20px 20px",
        background: theme === "dark" ? "#0a0a14" : "#1a1a1a", zIndex: 50,
      }} />
      {/* Status Bar */}
      <div style={{
        height: 54, padding: "0 28px", display: "flex", alignItems: "flex-end",
        justifyContent: "space-between", paddingBottom: 6, flexShrink: 0, zIndex: 40,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'SF Pro Display', -apple-system, sans-serif" }}>9:41</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <svg width="16" height="12" viewBox="0 0 16 12"><rect x="0" y="5" width="3" height="7" rx="0.5" fill={t.text} opacity="0.4" /><rect x="4.5" y="3" width="3" height="9" rx="0.5" fill={t.text} opacity="0.6" /><rect x="9" y="1" width="3" height="11" rx="0.5" fill={t.text} opacity="0.8" /><rect x="13" y="0" width="3" height="12" rx="0.5" fill={t.text} /></svg>
          <svg width="15" height="12" viewBox="0 0 15 12"><path d="M7.5 3.6c1.8 0 3.4.7 4.6 1.9l1.4-1.4C11.8 2.4 9.7 1.6 7.5 1.6S3.2 2.4 1.5 4.1l1.4 1.4C4.1 4.3 5.7 3.6 7.5 3.6z" fill={t.text} /><path d="M7.5 7.2c1 0 1.9.4 2.6 1l1.4-1.4c-1-1-2.4-1.6-4-1.6s-3 .6-4 1.6l1.4 1.4c.7-.6 1.6-1 2.6-1z" fill={t.text} /><circle cx="7.5" cy="10.5" r="1.5" fill={t.text} /></svg>
          <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0" y="1" width="23" height="11" rx="2" stroke={t.text} strokeWidth="1" fill="none" opacity="0.35" /><rect x="24.5" y="4" width="2" height="5" rx="1" fill={t.text} opacity="0.4" /><rect x="1.5" y="2.5" width="18" height="8" rx="1" fill={t.success} /></svg>
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
      {/* Home Indicator */}
      <div style={{
        height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <div style={{ width: 134, height: 5, borderRadius: 100, background: t.text, opacity: 0.2 }} />
      </div>
    </div>
  );
};
