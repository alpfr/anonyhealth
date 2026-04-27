import { BottomNav } from "./components/BottomNav";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";

import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import { useTenant } from "./context/TenantContext";
import { supabase } from "./supabaseClient";
import { logAuditEvent } from "./utils/audit";
import { callFunction } from "./utils/functions";
import { isValidEmail, isStrongPassword } from "./utils/validation";
import { T, Icons } from "./constants/theme";

// Lazy-loaded screens for code splitting
const PatientDashboard = lazy(() => import("./screens/PatientDashboard").then(m => ({ default: m.PatientDashboard })));
const AIChatMobile = lazy(() => import("./screens/AIChatMobile").then(m => ({ default: m.AIChatMobile })));
const SettingsMobile = lazy(() => import("./screens/SettingsMobile").then(m => ({ default: m.SettingsMobile })));
const HistoryMobile = lazy(() => import("./screens/HistoryMobile").then(m => ({ default: m.HistoryMobile })));
const AboutMobile = lazy(() => import("./screens/AboutMobile").then(m => ({ default: m.AboutMobile })));
const DoctorOnboardingMobile = lazy(() => import("./screens/DoctorOnboardingMobile").then(m => ({ default: m.DoctorOnboardingMobile })));
const BillingInactiveMobile = lazy(() => import("./screens/BillingInactiveMobile").then(m => ({ default: m.BillingInactiveMobile })));
const AcceptInviteMobile = lazy(() => import("./screens/AcceptInviteMobile").then(m => ({ default: m.AcceptInviteMobile })));
const DoctorDashboardMobile = lazy(() => import("./screens/DoctorDashboardMobile").then(m => ({ default: m.DoctorDashboardMobile })));
const PatientDetailMobile = lazy(() => import("./screens/PatientDetailMobile").then(m => ({ default: m.PatientDetailMobile })));
const MessagesMobile = lazy(() => import("./screens/MessagesMobile").then(m => ({ default: m.MessagesMobile })));
const ProviderProfileMobile = lazy(() => import("./screens/ProviderProfileMobile").then(m => ({ default: m.ProviderProfileMobile })));
const LegalPage = lazy(() => import("./screens/LegalPage").then(m => ({ default: m.LegalPage })));
const LandingPage = lazy(() => import("./screens/LandingPage").then(m => ({ default: m.LandingPage })));
const PatientProfileSetup = lazy(() => import("./screens/PatientProfileSetup").then(m => ({ default: m.PatientProfileSetup })));

// Loading fallback for lazy components
const ScreenLoader = ({ theme }) => {
  const t = T[theme] || T.light;
  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Outfit', sans-serif", color: t.textMut, fontSize: 14,
    }}>
      Loading...
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// AUTH GATE — email + password sign in, signup with 6-digit email OTP
// ═══════════════════════════════════════════════════════════
const AuthGate = ({ children, initialMode = "signin", showLanding = false }) => {
  const { session, loading, signIn } = useAuth();
  const [mode, setMode] = useState(initialMode); // signin | signup | verify
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetMessages = () => { setError(""); setInfo(""); };

  const handleSignIn = useCallback(async () => {
    resetMessages();
    if (!isValidEmail(email)) { setError("Please enter a valid email address."); return; }
    if (!password) { setError("Please enter your password."); return; }

    setSubmitting(true);
    const { data, error: signInError } = await signIn(email, password);
    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }
    if (data?.user) logAuditEvent("auth.sign_in", "User signed in");
  }, [email, password, signIn]);

  const handleSignUp = useCallback(async () => {
    resetMessages();
    if (!isValidEmail(email)) { setError("Please enter a valid email address."); return; }
    if (!isStrongPassword(password)) {
      setError("Password must be 8+ characters and include uppercase, lowercase, and a digit.");
      return;
    }

    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);

    if (signUpError) { setError(signUpError.message); return; }

    // When email confirmation is enabled, Supabase returns a user with no
    // session and emails a 6-digit OTP (if the project's confirmation email
    // template uses {{ .Token }}). Prompt for it.
    if (data?.session) {
      logAuditEvent("auth.sign_up", "User signed up (no confirmation required)");
      return;
    }
    setMode("verify");
    setInfo("We sent a 6-digit code to your email. Enter it below to finish creating your account.");
  }, [email, password]);

  const handleVerifyOtp = useCallback(async () => {
    resetMessages();
    const token = otp.trim();
    if (!/^\d{6}$/.test(token)) { setError("Enter the 6-digit code from your email."); return; }

    setSubmitting(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email, token, type: "signup",
    });
    setSubmitting(false);

    if (verifyError) { setError(verifyError.message); return; }
    if (data?.user) logAuditEvent("auth.sign_up", "Email OTP verified");
  }, [email, otp]);

  const resendOtp = useCallback(async () => {
    resetMessages();
    setSubmitting(true);
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    setSubmitting(false);
    if (resendError) setError(resendError.message);
    else setInfo("Code resent. Check your inbox.");
  }, [email]);

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ fontSize: 14, color: "#64748b" }}>Loading...</div>
      </div>
    );
  }
  if (session) return children;

  if (showLanding) {
    return (
      <Suspense fallback={null}>
        <LandingPage
          onPrimaryAction={() => { window.location.href = "/signup"; }}
          onSignIn={() => { window.location.href = "/signin"; }}
        />
      </Suspense>
    );
  }

  const activeTabStyle = { borderBottom: "2px solid #0f172a", color: "#0f172a", fontWeight: 600 };
  const inactiveTabStyle = { borderBottom: "2px solid transparent", color: "#64748b", fontWeight: 500 };
  const inputStyle = {
    width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0",
    background: "#f1f5f9", fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box",
  };
  const primaryBtn = (busy) => ({
    width: "100%", padding: "14px", borderRadius: 12, border: "none",
    cursor: busy ? "wait" : "pointer", background: "#0f172a", color: "#fff",
    fontSize: 14, fontWeight: 600, opacity: busy ? 0.7 : 1,
  });

  return (
    <div style={{
      height: "100vh", background: "#f8fafc", fontFamily: "'Outfit', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 380, background: "#fff", padding: 32, borderRadius: 24,
        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)", textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #38bdf8, #818cf8)",
          margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 20px rgba(56,189,248,0.25)",
        }}>
          {Icons.shield("#fff", 24)}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 20 }}>AnonyHealth</h2>

        {mode !== "verify" && (
          <>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16, textAlign: "center", lineHeight: 1.5 }}>
              For healthcare providers. Patients join through an invite link from their provider.
            </p>
            <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #e2e8f0" }}>
              <button type="button" onClick={() => { setMode("signin"); resetMessages(); }}
                style={{ flex: 1, padding: "10px", background: "none", border: "none", cursor: "pointer", fontSize: 14, ...(mode === "signin" ? activeTabStyle : inactiveTabStyle) }}>
                Provider sign in
              </button>
              <button type="button" onClick={() => { setMode("signup"); resetMessages(); }}
                style={{ flex: 1, padding: "10px", background: "none", border: "none", cursor: "pointer", fontSize: 14, ...(mode === "signup" ? activeTabStyle : inactiveTabStyle) }}>
                Sign up as provider
              </button>
            </div>
          </>
        )}

        {mode === "verify" ? (
          <>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16, textAlign: "left" }}>{info}</p>
            <input
              inputMode="numeric" maxLength={6} autoComplete="one-time-code"
              placeholder="6-digit code" value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              style={{ ...inputStyle, letterSpacing: "0.5em", textAlign: "center", fontSize: 18 }}
            />
            {error && <div role="alert" style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{error}</div>}
            <button onClick={handleVerifyOtp} disabled={submitting} style={primaryBtn(submitting)}>
              {submitting ? "Verifying..." : "Verify"}
            </button>
            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <button type="button" onClick={resendOtp} disabled={submitting}
                style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", padding: 0 }}>
                Resend code
              </button>
              <button type="button" onClick={() => { setMode("signup"); setOtp(""); resetMessages(); }}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0 }}>
                Use a different email
              </button>
            </div>
          </>
        ) : (
          <>
            <input type="email" inputMode="email" autoComplete="email"
              placeholder="Email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (mode === "signin" ? handleSignIn() : handleSignUp())}
              style={inputStyle} />
            <input type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (mode === "signin" ? handleSignIn() : handleSignUp())}
              style={{ ...inputStyle, border: `1px solid ${error ? "#ef4444" : "#e2e8f0"}` }} />

            {mode === "signup" && (
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12, textAlign: "left" }}>
                Min 8 characters, with uppercase, lowercase, and a digit.
              </div>
            )}

            {error && <div role="alert" style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{error}</div>}
            {info && <div style={{ fontSize: 13, color: "#16a34a", marginBottom: 12 }}>{info}</div>}

            <button onClick={mode === "signin" ? handleSignIn : handleSignUp}
              disabled={submitting} style={primaryBtn(submitting)}>
              {submitting
                ? (mode === "signin" ? "Signing in..." : "Creating account...")
                : (mode === "signin" ? "Sign In" : "Create provider account")}
            </button>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0", fontSize: 12, color: "#64748b" }}>
              Patient with an invite? Open the link your provider sent you.
            </div>
          </>
        )}

        <div style={{ marginTop: 18, fontSize: 11, color: "#94a3b8", display: "flex", gap: 12, justifyContent: "center" }}>
          <a href="/terms" style={{ color: "#94a3b8", textDecoration: "none" }}>Terms</a>
          <span>·</span>
          <a href="/privacy" style={{ color: "#94a3b8", textDecoration: "none" }}>Privacy</a>
          <span>·</span>
          <a href="/hipaa" style={{ color: "#94a3b8", textDecoration: "none" }}>HIPAA</a>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// TENANT GATE — routes based on membership / subscription / URL
// ═══════════════════════════════════════════════════════════
function parseRoute() {
  const path = window.location.pathname;
  const inviteMatch = path.match(/^\/invite\/([A-Za-z0-9_-]{16,128})\/?$/);
  if (inviteMatch) return { kind: "invite", token: inviteMatch[1] };
  if (path.startsWith("/billing/success")) return { kind: "billing_success" };
  if (path.startsWith("/billing/cancel"))  return { kind: "billing_cancel" };
  if (path === "/terms")   return { kind: "legal", page: "terms" };
  if (path === "/privacy") return { kind: "legal", page: "privacy" };
  if (path === "/hipaa")   return { kind: "legal", page: "hipaa" };
  if (path === "/signup")  return { kind: "auth", mode: "signup" };
  if (path === "/signin")  return { kind: "auth", mode: "signin" };
  return { kind: "app" };
}

const TenantGate = ({ children }) => {
  const { theme } = useTheme();
  const { loading, membership, subscription, isDoctor, hasActiveSubscription, refresh } = useTenant();
  const [route] = useState(parseRoute);
  const [postCheckout, setPostCheckout] = useState(route.kind === "billing_success");

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
      try { await callFunction("sync-subscription", {}); } catch (e) { console.warn("sync failed:", e.message); }
      await refresh();
      if (tries >= 8) {
        clearInterval(id);
        window.history.replaceState(null, "", "/");
        setPostCheckout(false);
      }
    }, 1800);
    return () => clearInterval(id);
  }, [postCheckout, hasActiveSubscription, refresh]);

  if (loading) {
    return <ScreenLoader theme={theme} />;
  }

  if (postCheckout) {
    return <ScreenLoader theme={theme} />;
  }

  // Doctor path: no tenant yet → onboarding; tenant but subscription inactive → billing screen.
  if (!membership) {
    return (
      <Suspense fallback={<ScreenLoader theme={theme} />}>
        <DoctorOnboardingMobile theme={theme} />
      </Suspense>
    );
  }
  if (isDoctor && !hasActiveSubscription) {
    return (
      <Suspense fallback={<ScreenLoader theme={theme} />}>
        <BillingInactiveMobile theme={theme} subscription={subscription} onRefresh={refresh} />
      </Suspense>
    );
  }

  if (isDoctor) {
    return (
      <Suspense fallback={<ScreenLoader theme={theme} />}>
        <DoctorApp />
      </Suspense>
    );
  }

  return children;
};

function DoctorApp() {
  const { theme } = useTheme();
  const { session } = useAuth();
  const [screen, setScreen] = useState({ name: "home" });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: T[theme].bg }}>
      <Suspense fallback={<ScreenLoader theme={theme} />}>
        {screen.name === "home" && (
          <DoctorDashboardMobile
            theme={theme}
            onOpenPatient={(id) => setScreen({ name: "patient", patientUserId: id })}
            onOpenSettings={() => setScreen({ name: "settings" })}
          />
        )}
        {screen.name === "patient" && (
          <PatientDetailMobile
            theme={theme}
            patientUserId={screen.patientUserId}
            onBack={() => setScreen({ name: "home" })}
            onMessage={() => setScreen({ name: "messages", patientUserId: screen.patientUserId, patientLabel: screen.patientLabel })}
          />
        )}
        {screen.name === "messages" && (
          <MessagesMobile
            theme={theme}
            patientUserId={screen.patientUserId}
            headerLabel={screen.patientLabel || "Patient"}
            onBack={() => setScreen({ name: "patient", patientUserId: screen.patientUserId })}
          />
        )}
        {screen.name === "settings" && (
          <SettingsMobile
            theme={theme}
            onBack={() => setScreen({ name: "home" })}
            session={session}
            onNavigate={(target) => {
              if (target === "providerProfile") setScreen({ name: "providerProfile" });
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
      </Suspense>
    </div>
  );
}

function InviteRoute({ token }) {
  const { theme } = useTheme();
  return (
    <Suspense fallback={<ScreenLoader theme={theme} />}>
      <AcceptInviteMobile theme={theme} token={token}
        onJoined={() => { window.history.replaceState(null, "", "/"); window.location.reload(); }} />
    </Suspense>
  );
}

export default function AnonyHealthApp() {
  const [route] = useState(parseRoute);

  if (route.kind === "legal") {
    // Legal pages are public — no auth, no tenant lookup.
    return (
      <Suspense fallback={null}>
        <LegalPage kind={route.page} />
      </Suspense>
    );
  }

  if (route.kind === "invite") {
    // Invite URL bypasses the normal gates so a patient can sign up to accept.
    return <InviteRoute token={route.token} />;
  }

  const isAuthRoute = route.kind === "auth";
  const initialMode = isAuthRoute ? route.mode : "signin";

  return (
    <AuthGate initialMode={initialMode} showLanding={!isAuthRoute}>
      <TenantGate>
        <AnonyHealthAppContent />
      </TenantGate>
    </AuthGate>
  );
}

// Single responsive shell. Same layout on phone and desktop — content
// constrained to a max-width column on wider screens. No phone-frame
// preview, no view-mode switcher, no provider directory. Patients have
// exactly one provider; doctors have a separate DoctorApp shell.
function AnonyHealthAppContent() {
  const { theme, t, isDark, toggleTheme } = useTheme();
  const { session } = useAuth();
  const { tenant } = useTenant();
  const [screen, setScreen] = useState("dashboard");
  const [chatInitialMsg, setChatInitialMsg] = useState("");
  const [profileState, setProfileState] = useState({ loading: true, exists: false });

  useEffect(() => {
    let cancelled = false;
    const userId = session?.user?.id;
    if (!userId) { setProfileState({ loading: false, exists: false }); return; }
    import("./services/patientProfile")
      .then(({ getPatientProfile }) => getPatientProfile(userId))
      .then((row) => { if (!cancelled) setProfileState({ loading: false, exists: !!row }); })
      .catch(() => { if (!cancelled) setProfileState({ loading: false, exists: false }); });
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const navigate = useCallback((s, msg) => {
    setChatInitialMsg(msg ?? "");
    setScreen(s);
  }, []);

  const renderScreen = () => {
    const props = { theme };
    switch (screen) {
      case "chat":
        return <AIChatMobile {...props} initialMsg={chatInitialMsg} onBack={() => setScreen("dashboard")} />;
      case "messages":
        return <MessagesMobile {...props} headerLabel="Your provider" onBack={() => setScreen("dashboard")} />;
      case "settings":
        return <SettingsMobile {...props} session={session} onNavigate={(s) => setScreen(s)} onBack={() => setScreen("dashboard")} />;
      case "about":
        return <AboutMobile {...props} onBack={() => setScreen("dashboard")} />;
      case "history":
        return <HistoryMobile {...props} onBack={() => setScreen("dashboard")} />;
      default:
        return <PatientDashboard {...props} onNavigate={navigate} />;
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: t.bg, color: t.text,
      fontFamily: "'Outfit', -apple-system, sans-serif",
      display: "flex", flexDirection: "column",
    }}>
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

      <div style={{
        flex: 1, width: "100%", maxWidth: 480, margin: "0 auto",
        display: "flex", flexDirection: "column", minHeight: 0, position: "relative",
      }}>
        <Suspense fallback={<ScreenLoader theme={theme} />}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {profileState.loading ? (
              <ScreenLoader theme={theme} />
            ) : !profileState.exists ? (
              <PatientProfileSetup
                theme={theme}
                userId={session?.user?.id}
                tenantId={tenant?.id}
                tenantName={tenant?.name}
                onComplete={() => setProfileState({ loading: false, exists: true })}
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
      <button onClick={toggleTheme} style={{
        position: "fixed", bottom: 96, right: 16, zIndex: 60,
        background: t.bgCard, border: `1px solid ${t.border}`,
        padding: 8, borderRadius: 999, cursor: "pointer",
        boxShadow: t.shadow, display: "flex",
      }}>
        {isDark ? Icons.sun(t.textSec, 16) : Icons.moon(t.textSec, 16)}
      </button>
    </div>
  );
}
