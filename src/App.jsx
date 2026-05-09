import { useState, lazy, Suspense } from "react";
import { useTheme } from "./context/ThemeContext";
import { AuthGate } from "./components/AuthGate";
import { TenantGate } from "./components/TenantGate";
import { PatientApp } from "./components/PatientApp";
import { ScreenLoader } from "./components/ScreenLoader";
import { parseRoute } from "./utils/parseRoute";

const AcceptInviteMobile = lazy(() =>
  import("./screens/AcceptInviteMobile").then((m) => ({
    default: m.AcceptInviteMobile,
  }))
);
const LegalPage = lazy(() =>
  import("./screens/LegalPage").then((m) => ({ default: m.LegalPage }))
);
const ResetPasswordPage = lazy(() =>
  import("./screens/ResetPasswordPage").then((m) => ({
    default: m.ResetPasswordPage,
  }))
);

// ─── Invite route (public, bypasses auth + tenant gates) ─
function InviteRoute({ token }) {
  const { theme } = useTheme();
  return (
    <Suspense fallback={<ScreenLoader theme={theme} />}>
      <AcceptInviteMobile
        theme={theme}
        token={token}
        onJoined={() => {
          window.history.replaceState(null, "", "/");
          window.location.reload();
        }}
      />
    </Suspense>
  );
}

// ─── Root component ──────────────────────────────────────
export default function AnonyHealthApp() {
  const [route] = useState(parseRoute);

  // Legal pages are public — no auth, no tenant lookup.
  if (route.kind === "legal") {
    return (
      <Suspense fallback={null}>
        <LegalPage kind={route.page} />
      </Suspense>
    );
  }

  // Invite URL bypasses the normal gates so a patient can sign up to accept.
  if (route.kind === "invite") {
    return <InviteRoute token={route.token} />;
  }

  // Recovery link from the password-reset email.
  if (route.kind === "reset_password") {
    return (
      <Suspense fallback={null}>
        <ResetPasswordPage />
      </Suspense>
    );
  }

  // Main app: AuthGate → TenantGate → PatientApp (or DoctorApp via TenantGate)
  const isAuthRoute = route.kind === "auth";
  const initialMode = isAuthRoute ? route.mode : "signin";

  return (
    <AuthGate initialMode={initialMode} showLanding={!isAuthRoute}>
      <TenantGate route={route}>
        <PatientApp />
      </TenantGate>
    </AuthGate>
  );
}
