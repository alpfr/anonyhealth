import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { T, Icons } from "../constants/theme";

/**
 * ProfileMenu — header dropdown showing current identity tier, with quick
 * actions appropriate to that tier:
 *
 *   • Anonymous → "Save session" (upgrade) + "Start fresh" (new anon)
 *   • Patient   → email shown, "Settings", "Sign out"
 *   • Provider  → email + practice shown, "Settings", "Sign out"
 *
 * Closes on outside click, Escape, or item selection.
 */
export const ProfileMenu = ({ theme = "light", onNavigate }) => {
  const t = T[theme] || T.light;
  const { user, isAnonymous, signOut, signInAnonymously } = useAuth();
  const { tenant } = useTenant();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    // Force a clean reload so AuthGate re-bootstraps from scratch.
    window.location.href = "/";
  };

  const handleStartFresh = async () => {
    setOpen(false);
    // Sign out the current anon session, then create a new one. AuthGate's
    // bootstrap effect will pick up the fresh session on the next render.
    await signOut();
    await signInAnonymously();
    window.location.href = "/";
  };

  const handleUpgrade = () => {
    setOpen(false);
    window.location.href = "/signup";
  };

  const handleSettings = () => {
    setOpen(false);
    if (onNavigate) {
      onNavigate("settings");
    } else {
      // Fallback: emit a custom event PatientApp/DoctorApp can listen for.
      // This lets MobileNav-using screens that didn't thread the prop still
      // navigate to settings.
      window.dispatchEvent(new CustomEvent("anonyhealth:navigate", { detail: "settings" }));
    }
  };

  // ─── Trigger appearance ─────────────────────────────────
  const tierLabel = isAnonymous
    ? "Anonymous"
    : tenant?.name
      ? tenant.name
      : user?.email
        ? user.email.split("@")[0]
        : "Account";

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px 5px 8px",
          borderRadius: 999,
          border: `1px solid ${t.border}`,
          background: t.bgCard,
          cursor: "pointer",
          fontFamily: "'Outfit', sans-serif",
          fontSize: 12.5,
          color: t.text,
          fontWeight: 500,
          maxWidth: 160,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            background: isAnonymous ? t.accentGlow : t.gradient,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isAnonymous
            ? Icons.eyeOff(t.accent, 10)
            : Icons.user("#fff", 10)}
        </div>
        <span
          style={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 110,
          }}
        >
          {tierLabel}
        </span>
        {Icons.chevDown(t.textSec, 12)}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 200,
            width: 240,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: 14,
            boxShadow: t.shadowLg,
            overflow: "hidden",
            fontFamily: "'Outfit', sans-serif",
            animation: "menuIn 0.15s ease",
          }}
        >
          <style>{`
            @keyframes menuIn {
              from { opacity: 0; transform: translateY(-6px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Identity header */}
          <div
            style={{
              padding: "12px 14px",
              borderBottom: `1px solid ${t.border}`,
              background: isAnonymous ? t.accentGlow : "transparent",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: isAnonymous ? t.accent : t.textMut,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              {isAnonymous ? "Anonymous session" : "Signed in"}
            </div>
            {isAnonymous ? (
              <div style={{ fontSize: 12.5, color: t.textSec, lineHeight: 1.4 }}>
                No personal info collected. Save your session to keep history.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13.5, color: t.text, fontWeight: 600, wordBreak: "break-all" }}>
                  {user?.email}
                </div>
                {tenant?.name && (
                  <div style={{ fontSize: 11.5, color: t.textMut, marginTop: 2 }}>
                    {tenant.name}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div style={{ padding: 4 }}>
            {isAnonymous ? (
              <>
                <MenuItem
                  theme={theme}
                  icon={Icons.shield(t.accent, 14)}
                  label="Save my session"
                  desc="Create an account"
                  onClick={handleUpgrade}
                  primary
                />
                <MenuItem
                  theme={theme}
                  icon={Icons.eyeOff(t.textSec, 14)}
                  label="Start fresh"
                  desc="Clear and begin a new anonymous session"
                  onClick={handleStartFresh}
                />
                <MenuDivider theme={theme} />
                <MenuItem
                  theme={theme}
                  icon={Icons.user(t.textSec, 14)}
                  label="Sign in"
                  onClick={() => { window.location.href = "/signin"; }}
                />
              </>
            ) : (
              <>
                <MenuItem
                  theme={theme}
                  icon={Icons.settings(t.textSec, 14)}
                  label="Settings"
                  onClick={handleSettings}
                />
                <MenuItem
                  theme={theme}
                  icon={Icons.lock(t.textSec, 14)}
                  label="Sign out"
                  onClick={handleSignOut}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Subcomponents ───────────────────────────────────────
const MenuItem = ({ theme, icon, label, desc, onClick, primary }) => {
  const t = T[theme] || T.light;
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
        borderRadius: 8,
        fontFamily: "'Outfit', sans-serif",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = t.bgHover || t.bgInput; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: primary ? t.accentGlow : t.chipBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: primary ? 600 : 500, color: primary ? t.accent : t.text }}>
          {label}
        </div>
        {desc && (
          <div style={{ fontSize: 11, color: t.textMut, marginTop: 1 }}>
            {desc}
          </div>
        )}
      </div>
    </button>
  );
};

const MenuDivider = ({ theme }) => {
  const t = T[theme] || T.light;
  return <div style={{ height: 1, background: t.border, margin: "4px 8px" }} />;
};
