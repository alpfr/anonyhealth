import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { BottomNav } from "./BottomNav";
import { ScreenLoader } from "./ScreenLoader";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { Icons } from "../constants/theme";

const PatientDashboard = lazy(() =>
  import("../screens/PatientDashboard").then((m) => ({
    default: m.PatientDashboard,
  }))
);
const AIChatMobile = lazy(() =>
  import("../screens/AIChatMobile").then((m) => ({
    default: m.AIChatMobile,
  }))
);
const SettingsMobile = lazy(() =>
  import("../screens/SettingsMobile").then((m) => ({
    default: m.SettingsMobile,
  }))
);
const HistoryMobile = lazy(() =>
  import("../screens/HistoryMobile").then((m) => ({
    default: m.HistoryMobile,
  }))
);
const AboutMobile = lazy(() =>
  import("../screens/AboutMobile").then((m) => ({
    default: m.AboutMobile,
  }))
);
const MessagesMobile = lazy(() =>
  import("../screens/MessagesMobile").then((m) => ({
    default: m.MessagesMobile,
  }))
);
const BookAppointmentMobile = lazy(() =>
  import("../screens/BookAppointmentMobile").then((m) => ({
    default: m.BookAppointmentMobile,
  }))
);
const PatientProfileSetup = lazy(() =>
  import("../screens/PatientProfileSetup").then((m) => ({
    default: m.PatientProfileSetup,
  }))
);

/**
 * PatientApp — navigation shell for patient-role users.
 *
 * Single responsive column layout (max-width 480px, centered).
 * Checks for patient profile existence; shows onboarding if missing.
 */
export const PatientApp = () => {
  const { theme, t, isDark, toggleTheme } = useTheme();
  const { session } = useAuth();
  const { tenant } = useTenant();
  const [screen, setScreen] = useState("dashboard");
  const [chatInitialMsg, setChatInitialMsg] = useState("");
  const [profileState, setProfileState] = useState({
    loading: true,
    exists: false,
  });

  useEffect(() => {
    let cancelled = false;
    const userId = session?.user?.id;
    if (!userId) {
      setProfileState({ loading: false, exists: false });
      return;
    }
    import("../services/patientProfile")
      .then(({ getPatientProfile }) => getPatientProfile(userId))
      .then((row) => {
        if (!cancelled) setProfileState({ loading: false, exists: !!row });
      })
      .catch(() => {
        if (!cancelled) setProfileState({ loading: false, exists: false });
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const navigate = useCallback((s, msg) => {
    setChatInitialMsg(msg ?? "");
    setScreen(s);
  }, []);

  const renderScreen = () => {
    const props = { theme };
    switch (screen) {
      case "chat":
        return (
          <AIChatMobile
            {...props}
            initialMsg={chatInitialMsg}
            onBack={() => setScreen("dashboard")}
          />
        );
      case "messages":
        return (
          <MessagesMobile
            {...props}
            headerLabel="Your provider"
            onBack={() => setScreen("dashboard")}
          />
        );
      case "settings":
        return (
          <SettingsMobile
            {...props}
            session={session}
            onNavigate={(s) => setScreen(s)}
            onBack={() => setScreen("dashboard")}
          />
        );
      case "about":
        return (
          <AboutMobile {...props} onBack={() => setScreen("dashboard")} />
        );
      case "history":
        return (
          <HistoryMobile {...props} onBack={() => setScreen("dashboard")} />
        );
      case "book":
        return (
          <BookAppointmentMobile
            {...props}
            onBack={() => setScreen("dashboard")}
          />
        );
      default:
        return <PatientDashboard {...props} onNavigate={navigate} />;
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.text,
        fontFamily: "'Outfit', -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; background: ${t.bg}; }
        input::placeholder { color: ${t.textMut}; }
        ::selection { background: ${t.accent}25; }
        button { transition: all 0.2s; }
        button:hover { filter: brightness(1.04); }
        button:active { transform: scale(0.97); }
        @keyframes chatIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dotPulse { 0%,60%,100% { transform: translateY(0); opacity: 0.35; } 30% { transform: translateY(-5px); opacity: 1; } }
      `}</style>

      <div
        style={{
          flex: 1,
          width: "100%",
          maxWidth: 480,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          position: "relative",
        }}
      >
        <Suspense fallback={<ScreenLoader theme={theme} />}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {profileState.loading ? (
              <ScreenLoader theme={theme} />
            ) : !profileState.exists ? (
              <PatientProfileSetup
                theme={theme}
                userId={session?.user?.id}
                tenantId={tenant?.id}
                tenantName={tenant?.name}
                onComplete={() =>
                  setProfileState({ loading: false, exists: true })
                }
              />
            ) : (
              renderScreen()
            )}
          </div>
        </Suspense>
        {profileState.exists && (
          <BottomNav theme={theme} current={screen} onNavigate={setScreen} />
        )}
      </div>

      {/* Subtle theme toggle — corner button on wide screens. */}
      <button
        onClick={toggleTheme}
        style={{
          position: "fixed",
          bottom: 96,
          right: 16,
          zIndex: 60,
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          padding: 8,
          borderRadius: 999,
          cursor: "pointer",
          boxShadow: t.shadow,
          display: "flex",
        }}
      >
        {isDark ? Icons.sun(t.textSec, 16) : Icons.moon(t.textSec, 16)}
      </button>
    </div>
  );
};
