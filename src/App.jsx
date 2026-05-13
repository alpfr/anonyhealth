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
const LandingPage = lazy(() =>
  import("./screens/LandingPage").then((m) => ({ default: m.LandingPage }))
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

  // Provider marketing landing page — opt-in via /for-providers.
  if (route.kind === "landing") {
    return (
      <Suspense fallback={null}>
        <LandingPage
          onPrimaryAction={() => { window.location.href = "/signup"; }}
          onSignIn={() => { window.location.href = "/signin"; }}
        />
      </Suspense>
    );
  }

  // Main app: AuthGate → TenantGate → PatientApp (or DoctorApp via TenantGate).
  //
  // Tier rules:
  //   • /signin, /signup     → show the auth form (tier still allows anonymous,
  //                             but explicit-auth-form takes precedence)
  //   • everywhere else      → "anonymous_ok" — visitors get a Supabase
  //                             anonymous session and can use AI triage
  //                             immediately. Provider-only screens are still
  //                             protected inside TenantGate / PatientApp.
  const isAuthRoute = route.kind === "auth";
  const initialMode = isAuthRoute ? route.mode : "signin";

  return (
    <AuthGate
      initialMode={initialMode}
      tier="anonymous_ok"
    >
      <TenantGate route={route}>
        <PatientApp />
      </TenantGate>
    </AuthGate>
  );
}
