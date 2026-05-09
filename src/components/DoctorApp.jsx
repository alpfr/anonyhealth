import { useState, lazy, Suspense } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { T } from "../constants/theme";
import { ScreenLoader } from "./ScreenLoader";

const DoctorDashboardMobile = lazy(() =>
  import("../screens/DoctorDashboardMobile").then((m) => ({
    default: m.DoctorDashboardMobile,
  }))
);
const PatientDetailMobile = lazy(() =>
  import("../screens/PatientDetailMobile").then((m) => ({
    default: m.PatientDetailMobile,
  }))
);
const MessagesMobile = lazy(() =>
  import("../screens/MessagesMobile").then((m) => ({
    default: m.MessagesMobile,
  }))
);
const SettingsMobile = lazy(() =>
  import("../screens/SettingsMobile").then((m) => ({
    default: m.SettingsMobile,
  }))
);
const ProviderProfileMobile = lazy(() =>
  import("../screens/ProviderProfileMobile").then((m) => ({
    default: m.ProviderProfileMobile,
  }))
);
const AppointmentRequestsMobile = lazy(() =>
  import("../screens/AppointmentRequestsMobile").then((m) => ({
    default: m.AppointmentRequestsMobile,
  }))
);

/**
 * DoctorApp — navigation shell for doctor-role users.
 *
 * State-machine driven navigation: screen objects carry
 * both the screen name and any contextual data (e.g. patientUserId).
 */
export const DoctorApp = () => {
  const { theme } = useTheme();
  const { session } = useAuth();
  const [screen, setScreen] = useState({ name: "home" });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: T[theme].bg,
      }}
    >
      <Suspense fallback={<ScreenLoader theme={theme} />}>
        {screen.name === "home" && (
          <DoctorDashboardMobile
            theme={theme}
            onOpenPatient={(id) =>
              setScreen({ name: "patient", patientUserId: id })
            }
            onOpenSettings={() => setScreen({ name: "settings" })}
            onOpenAppointments={() =>
              setScreen({ name: "appointmentRequests" })
            }
          />
        )}
        {screen.name === "patient" && (
          <PatientDetailMobile
            theme={theme}
            patientUserId={screen.patientUserId}
            onBack={() => setScreen({ name: "home" })}
            onMessage={() =>
              setScreen({
                name: "messages",
                patientUserId: screen.patientUserId,
                patientLabel: screen.patientLabel,
              })
            }
          />
        )}
        {screen.name === "messages" && (
          <MessagesMobile
            theme={theme}
            patientUserId={screen.patientUserId}
            headerLabel={screen.patientLabel || "Patient"}
            onBack={() =>
              setScreen({
                name: "patient",
                patientUserId: screen.patientUserId,
              })
            }
          />
        )}
        {screen.name === "settings" && (
          <SettingsMobile
            theme={theme}
            onBack={() => setScreen({ name: "home" })}
            session={session}
            onNavigate={(target) => {
              if (target === "providerProfile")
                setScreen({ name: "providerProfile" });
              else setScreen({ name: "home" });
            }}
          />
        )}
        {screen.name === "providerProfile" && (
          <ProviderProfileMobile
            theme={theme}
            onBack={() => setScreen({ name: "settings" })}
          />
        )}
        {screen.name === "appointmentRequests" && (
          <AppointmentRequestsMobile
            theme={theme}
            onBack={() => setScreen({ name: "home" })}
          />
        )}
      </Suspense>
    </div>
  );
};
