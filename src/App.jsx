import { PhoneFrame } from "./components/PhoneFrame";
import { MobileNav } from "./components/MobileNav";
import { BottomNav } from "./components/BottomNav";
import { useState, useEffect, useCallback, lazy, Suspense } from "react";

import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import { useTenant } from "./context/TenantContext";
import { supabase } from "./supabaseClient";
import { fetchProviders as fetchProvidersService } from "./services/providers";
import { logAuditEvent } from "./utils/audit";
import { isValidEmail, isStrongPassword } from "./utils/validation";
import { T, Icons, Stars } from "./constants/theme";
import { PROVIDERS } from "./data/providers";

import { FilterChip } from "./components/FilterChip";
import { ProviderCard } from "./components/ProviderCard";
import { Toggle } from "./components/Toggle";

// Lazy-loaded screens for code splitting
const FindProviderDesktop = lazy(() => import("./screens/FindProviderDesktop").then(m => ({ default: m.FindProviderDesktop })));
const ProviderDetailsMobile = lazy(() => import("./screens/ProviderDetailsMobile").then(m => ({ default: m.ProviderDetailsMobile })));
const PatientDashboard = lazy(() => import("./screens/PatientDashboard").then(m => ({ default: m.PatientDashboard })));
const AIChatMobile = lazy(() => import("./screens/AIChatMobile").then(m => ({ default: m.AIChatMobile })));
const RegisterMobile = lazy(() => import("./screens/RegisterMobile").then(m => ({ default: m.RegisterMobile })));
const AnonReviewMobile = lazy(() => import("./screens/AnonReviewMobile").then(m => ({ default: m.AnonReviewMobile })));
const SettingsMobile = lazy(() => import("./screens/SettingsMobile").then(m => ({ default: m.SettingsMobile })));
const HistoryMobile = lazy(() => import("./screens/HistoryMobile").then(m => ({ default: m.HistoryMobile })));
const FindProviderMobile = lazy(() => import("./screens/FindProviderMobile").then(m => ({ default: m.FindProviderMobile })));
const AboutMobile = lazy(() => import("./screens/AboutMobile").then(m => ({ default: m.AboutMobile })));
const DoctorOnboardingMobile = lazy(() => import("./screens/DoctorOnboardingMobile").then(m => ({ default: m.DoctorOnboardingMobile })));
const BillingInactiveMobile = lazy(() => import("./screens/BillingInactiveMobile").then(m => ({ default: m.BillingInactiveMobile })));
const AcceptInviteMobile = lazy(() => import("./screens/AcceptInviteMobile").then(m => ({ default: m.AcceptInviteMobile })));
const DoctorDashboardMobile = lazy(() => import("./screens/DoctorDashboardMobile").then(m => ({ default: m.DoctorDashboardMobile })));
const PatientDetailMobile = lazy(() => import("./screens/PatientDetailMobile").then(m => ({ default: m.PatientDetailMobile })));

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
const AuthGate = ({ children }) => {
  const { session, loading, signIn } = useAuth();
  const [mode, setMode] = useState("signin"); // signin | signup | verify
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
  return { kind: "app" };
}

const TenantGate = ({ children }) => {
  const { theme } = useTheme();
  const { loading, membership, subscription, isDoctor, hasActiveSubscription, refresh } = useTenant();
  const [route] = useState(parseRoute);
  const [postCheckout, setPostCheckout] = useState(route.kind === "billing_success");

  // After Stripe redirects back, poll for a live subscription row (webhook race).
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
      await refresh();
      if (tries >= 10) {
        clearInterval(id);
        window.history.replaceState(null, "", "/");
        setPostCheckout(false);
      }
    }, 1500);
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
          />
        )}
        {screen.name === "settings" && (
          <SettingsMobile
            theme={theme}
            onBack={() => setScreen({ name: "home" })}
            session={session}
            onNavigate={() => setScreen({ name: "home" })}
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

  if (route.kind === "invite") {
    // Invite URL bypasses the normal gates so a patient can sign up to accept.
    return <InviteRoute token={route.token} />;
  }

  return (
    <AuthGate>
      <TenantGate>
        <AnonyHealthAppContent />
      </TenantGate>
    </AuthGate>
  );
}

const BREAKPOINT = 1024;

function AnonyHealthAppContent() {
  const { theme, t, isDark, toggleTheme } = useTheme();
  const { session } = useAuth();
  // desktopScreen reserved for future desktop-specific navigation
  const [desktopScreen] = useState("providers"); // eslint-disable-line no-unused-vars
  const [mobileScreen, setMobileScreen] = useState("dashboard");
  const [chatInitialMsg, setChatInitialMsg] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(0);
  const [providers, setProviders] = useState(PROVIDERS);
  const [isMobile, setIsMobile] = useState(window.innerWidth < BREAKPOINT);
  const [viewMode, setViewMode] = useState(window.innerWidth < BREAKPOINT ? "mobile" : "split");

  // Fetch providers from DB with fallback
  useEffect(() => {
    let cancelled = false;
    fetchProvidersService().then(data => {
      if (!cancelled) setProviders(data);
    });
    return () => { cancelled = true; };
  }, []);

  // Debounced resize handler
  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const mobile = window.innerWidth < BREAKPOINT;
        setIsMobile(mobile);
        if (mobile) setViewMode("mobile");
      }, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Memoized navigation handler to avoid re-creating on every render
  const handleMobileNavigate = useCallback((s, msg) => {
    if (msg) setChatInitialMsg(msg);
    else setChatInitialMsg("");
    setMobileScreen(s);
  }, []);

  const handleSelectProvider = useCallback((i) => {
    setSelectedProvider(i);
    setMobileScreen("providerDetail");
  }, []);

  const renderMobile = () => {
    const screenProps = { theme };
    return (
      <Suspense fallback={<ScreenLoader theme={theme} />}>
        {(() => {
          switch (mobileScreen) {
            case "dashboard": return <PatientDashboard {...screenProps} onNavigate={handleMobileNavigate} />;
            case "findProvider": return <FindProviderMobile {...screenProps} providers={providers} onSelectProvider={handleSelectProvider} />;
            case "providerDetail": return <ProviderDetailsMobile {...screenProps} provider={selectedProvider} providers={providers} onBack={() => setMobileScreen("findProvider")} onStartAnon={() => setMobileScreen("anonReview")} />;
            case "anonReview": return <AnonReviewMobile {...screenProps} onBack={() => setMobileScreen("providerDetail")} onConfirm={() => setMobileScreen("dashboard")} />;
            case "chat": return <AIChatMobile {...screenProps} initialMsg={chatInitialMsg} onBack={() => setMobileScreen("dashboard")} onBook={() => setMobileScreen("findProvider")} />;
            case "register": return <RegisterMobile {...screenProps} onBack={() => setMobileScreen("dashboard")} />;
            case "settings": return <SettingsMobile {...screenProps} session={session} onNavigate={(s) => setMobileScreen(s)} onBack={() => setMobileScreen("dashboard")} />;
            case "about": return <AboutMobile {...screenProps} onBack={() => setMobileScreen("dashboard")} />;
            case "history": return <HistoryMobile {...screenProps} onBack={() => setMobileScreen("dashboard")} />;
            default: return <PatientDashboard {...screenProps} onNavigate={(s) => setMobileScreen(s)} />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div style={{
      minHeight: "100vh", background: t.bg, transition: "background 0.4s",
      fontFamily: "'Outfit', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; background: ${t.bg}; }
        input::placeholder { color: ${t.textMut}; }
        ::selection { background: ${t.accent}25; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
        button { transition: all 0.2s; }
        button:hover { filter: brightness(1.04); }
        button:active { transform: scale(0.97); }
        @keyframes chatIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dotPulse { 0%,60%,100% { transform: translateY(0); opacity: 0.35; } 30% { transform: translateY(-5px); opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Dark mode ambient */}
      {isDark && (
        <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: "-15%", left: "-5%", width: "45%", height: "45%",
            background: "radial-gradient(circle, rgba(56,189,248,0.03) 0%, transparent 70%)",
            animation: "floatA 22s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", bottom: "-15%", right: "-5%", width: "50%", height: "50%",
            background: "radial-gradient(circle, rgba(192,132,252,0.03) 0%, transparent 70%)",
            animation: "floatA 28s ease-in-out infinite reverse",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `radial-gradient(${t.accent}06 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }} />
          <style>{`@keyframes floatA { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-20px); } }`}</style>
        </div>
      )}

      {/* Sidebar Navigation - Desktop only */}
      {!isMobile && (
        <div style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 220, zIndex: 100,
          background: t.bgNav, backdropFilter: "blur(20px) saturate(180%)",
          borderRight: `1px solid ${t.border}`,
          padding: "24px 20px", display: "flex", flexDirection: "column", gap: 32,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: t.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isDark ? `0 0 16px ${t.accent}25` : "none",
            }}>
              {Icons.shield("#fff", 17)}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: t.text, letterSpacing: "-0.02em", lineHeight: 1 }}>
                <span style={{ color: t.accent }}>Anony</span>Health
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, color: t.accent, opacity: 0.8, letterSpacing: "0.05em", marginTop: 2
              }}>
                CONFIDENTIAL PROTO
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>

            {/* View Modes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: 8 }}>
                View Mode
              </div>
              {["split", "desktop", "mobile"].map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif",
                  background: viewMode === mode ? t.accentLight : "transparent",
                  color: viewMode === mode ? t.accent : t.textSec,
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  transition: "all 0.2s ease"
                }}>
                  {viewMode === mode && <div style={{ width: 4, height: 4, borderRadius: 2, background: t.accent }} />}
                  {mode === "split" ? "Split View" : mode === "desktop" ? "Desktop Only" : "Mobile Only"}
                </button>
              ))}
            </div>

            {/* Mobile Screens */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: 8 }}>
                Mobile Screens
              </div>
              {["dashboard", "findProvider", "chat", "register", "settings", "about"].map(s => (
                <button key={s} onClick={() => setMobileScreen(s)} style={{
                  padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif",
                  background: mobileScreen === s ? t.chipBg : "transparent",
                  color: mobileScreen === s ? t.text : t.textMut,
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  transition: "all 0.2s ease"
                }}>
                  {s === "dashboard" ? "Dashboard" : s === "findProvider" ? "Find Provider" : s === "chat" ? "AI Chat" : s === "register" ? "Register" : s === "settings" ? "Settings" : "About / Help"}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Toggle */}
          <button onClick={toggleTheme} style={{
            width: "100%", padding: "12px", borderRadius: 12, border: `1px solid ${t.border}`,
            background: t.bgCard, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            color: t.text, fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif"
          }}>
            {isDark ? Icons.sun(t.textSec) : Icons.moon(t.textSec)}
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ paddingTop: isMobile ? 0 : 24, paddingLeft: isMobile ? 0 : 220, position: "relative", zIndex: 1, minHeight: "100vh" }}>
        {viewMode === "split" && (
          <div style={{
            display: "flex", gap: 40, padding: "48px 40px", alignItems: "flex-start",
            justifyContent: "center", minHeight: "calc(100vh - 64px)",
          }}>
            {/* Desktop */}
            <div style={{ flex: "1 1 50%", maxWidth: 860, paddingTop: 8 }}>
              <div style={{
                padding: "3px 12px", borderRadius: 6, background: t.chipBg,
                display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 20,
                border: `1px solid ${t.border}`,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: t.success }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: t.textSec, fontFamily: "'Outfit', sans-serif" }}>DESKTOP VIEW</span>
              </div>
              <Suspense fallback={<ScreenLoader theme={theme} />}>
                <FindProviderDesktop theme={theme} providers={providers} onSelectProvider={handleSelectProvider} />
              </Suspense>
            </div>

            {/* Mobile */}
            <div style={{ flexShrink: 0, position: "sticky", top: 112 }}>
              <div style={{
                padding: "3px 12px", borderRadius: 6, background: t.chipBg,
                display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 16,
                border: `1px solid ${t.border}`,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: t.accent }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: t.textSec, fontFamily: "'Outfit', sans-serif" }}>MOBILE VIEW</span>
              </div>
              <PhoneFrame theme={theme}>
                {renderMobile()}
              </PhoneFrame>
            </div>
          </div>
        )}

        {viewMode === "desktop" && (
          <div style={{ padding: "48px 40px", maxWidth: 920, margin: "0 auto" }}>
            <Suspense fallback={<ScreenLoader theme={theme} />}>
              <FindProviderDesktop theme={theme} providers={providers} onSelectProvider={(i) => { setSelectedProvider(i); setMobileScreen("providerDetail"); setViewMode("mobile"); }} />
            </Suspense>
          </div>
        )}

        {viewMode === "mobile" && (
          <div style={{ display: "flex", justifyContent: "center", padding: isMobile ? 0 : "48px 20px", height: isMobile ? "100vh" : "auto" }}>
            {isMobile ? (
              <div style={{ width: "100%", height: "100%", background: t.bg, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
                  {renderMobile()}
                </div>
                <BottomNav theme={theme} current={mobileScreen} onNavigate={setMobileScreen} />
              </div>
            ) : (
              <PhoneFrame theme={theme}>
                {renderMobile()}
              </PhoneFrame>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
