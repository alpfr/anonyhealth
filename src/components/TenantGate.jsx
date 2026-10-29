import { useState, useEffect, lazy, Suspense } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { callFunction } from "../utils/functions";
import { ScreenLoader } from "./ScreenLoader";

const DoctorOnboardingMobile = lazy(() =>
  import("../screens/DoctorOnboardingMobile").then((m) => ({
    default: m.DoctorOnboardingMobile,
  }))
);
const BillingInactiveMobile = lazy(() =>
  import("../screens/BillingInactiveMobile").then((m) => ({
    default: m.BillingInactiveMobile,
  }))
);
const DoctorApp = lazy(() =>
  import("./DoctorApp").then((m) => ({ default: m.DoctorApp }))
);

/**
 * TenantGate — routes users based on identity tier and membership.
 *
 * Order of precedence:
 *   1. Anonymous user                  → children (PatientApp, no tenant context)
 *   2. No membership                   → DoctorOnboardingMobile
 *   3. Doctor without subscription     → BillingInactiveMobile
 *   4. Doctor with active subscription → DoctorApp
 *   5. Patient (everyone else)         → children (PatientApp)
 *
 * Anonymous users skip tenant gating entirely. They get a temporary identity
 * for AI triage and provider browsing; when they convert to a real account
 * they're routed through the normal tenant flow.
 */
export const TenantGate = ({ children, route }) => {
  const { theme } = useTheme();
  const { isAnonymous, session } = useAuth();
  const {
    loading,
    membership,
    subscription,
    isDoctor,
    hasActiveSubscription,
    refresh,
  } = useTenant();
  const [postCheckout, setPostCheckout] = useState(
    route.kind === "billing_success"
  );

  // After Stripe redirects back, pull the subscription state from Stripe via
  // the sync-subscription Edge Function and refresh the tenant context.
  useEffect(() => {
    if (!postCheckout) return;
    if (hasActiveSubscription) {
      window.history.replaceState(null, "", "/");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPostCheckout(false);
      return;
    }
    let tries = 0;
    const id = setInterval(async () => {
      tries += 1;
      try {
        await callFunction("sync-subscription", {});
      } catch (e) {
        console.warn("sync failed:", e.message);
      }
      await refresh();
      if (tries >= 8) {
        clearInterval(id);
        window.history.replaceState(null, "", "/");
        setPostCheckout(false);
      }
    }, 1800);
    return () => clearInterval(id);
  }, [postCheckout, hasActiveSubscription, refresh]);

  if (loading || postCheckout) {
    return <ScreenLoader theme={theme} />;
  }

  // Anonymous users bypass all tenant gating — they're patients-in-waiting.
  if (isAnonymous) {
    return children;
  }

  // No tenant membership: route based on the user's stated role.
  // Providers/doctors → onboarding, patients → PatientApp (children).
  if (!membership) {
    const role = session?.user?.user_metadata?.role;
    if (role === "patient" || (!role && !isDoctor)) {
      // Authenticated patients without a tenant still use PatientApp.
      return children;
    }
    return (
      <Suspense fallback={<ScreenLoader theme={theme} />}>
        <DoctorOnboardingMobile theme={theme} />
      </Suspense>
    );
  }

  // Doctor with inactive subscription → billing screen
  if (isDoctor && !hasActiveSubscription) {
    return (
      <Suspense fallback={<ScreenLoader theme={theme} />}>
        <BillingInactiveMobile
          theme={theme}
          subscription={subscription}
          onRefresh={refresh}
        />
      </Suspense>
    );
  }

  // Active doctor → doctor shell
  if (isDoctor) {
    return (
      <Suspense fallback={<ScreenLoader theme={theme} />}>
        <DoctorApp />
      </Suspense>
    );
  }

  // Everyone else (patients) → children
  return children;
};
