import { T, Icons } from "../constants/theme";

export const BottomNav = ({ theme, current, onNavigate }) => {
  const t = T[theme];
  const items = [
    { id: "dashboard", icon: Icons.menu, label: "Dash" },
    { id: "findProvider", icon: Icons.search, label: "Find" },
    { id: "chat", icon: Icons.bot, label: "Chat" },
    { id: "register", icon: Icons.user, label: "Register" },
    { id: "settings", icon: Icons.settings, label: "Settings" },
  ];

  return (
    <div style={{
      height: 84, padding: "0 24px 20px", background: t.bgNav,
      backdropFilter: "blur(20px)", borderTop: `1px solid ${t.border}`,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      position: "relative", zIndex: 50, flexShrink: 0,
    }}>
      {items.map(item => {
        const isActive = current === item.id;
        return (
          <button key={item.id} onClick={() => onNavigate(item.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            padding: 0, minWidth: 48,
          }}>
            <div style={{
              color: isActive ? t.accent : t.textMut,
              transition: "all 0.2s",
              transform: isActive ? "translateY(-2px)" : "none",
            }}>
              {item.icon(isActive ? t.accent : t.textMut, 24)}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
              color: isActive ? t.accent : t.textMut, opacity: isActive ? 1 : 0.8,
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
