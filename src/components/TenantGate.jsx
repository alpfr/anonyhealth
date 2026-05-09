import { useState, useEffect, lazy, Suspense } from "react";
import { useTheme } from "../context/ThemeContext";
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
 * TenantGate — routes users based on membership, role, and subscription status.
 *
 * • No membership → DoctorOnboardingMobile (create a practice)
 * • Doctor without active subscription → BillingInactiveMobile
 * • Doctor with active subscription → DoctorApp
 * • Patient (or any other role) → children (PatientApp)
 */
export const TenantGate = ({ children, route }) => {
  const { theme } = useTheme();
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
  // the sync-subscription Edge Function (primary) and refresh the tenant
  // context. Webhooks remain a future enhancement; this guarantees the
  // user sees their active trial without depending on real-time delivery.
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

  // Doctor path: no tenant yet → onboarding
  if (!membership) {
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
