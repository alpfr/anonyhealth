import { PhoneFrame } from "./components/PhoneFrame";
import { MobileNav } from "./components/MobileNav";
import { BottomNav } from "./components/BottomNav";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

import { logAuditEvent } from "./utils/audit";
import { T, Icons, Stars } from "./constants/theme";
import { PROVIDERS } from "./data/providers";

import { FilterChip } from "./components/FilterChip";
import { ProviderCard } from "./components/ProviderCard";
import { Toggle } from "./components/Toggle";

import { FindProviderDesktop } from "./screens/FindProviderDesktop";
import { ProviderDetailsMobile } from "./screens/ProviderDetailsMobile";
import { PatientDashboard } from "./screens/PatientDashboard";
import { AIChatMobile } from "./screens/AIChatMobile";
import { RegisterMobile } from "./screens/RegisterMobile";
import { AnonReviewMobile } from "./screens/AnonReviewMobile";
import { SettingsMobile } from "./screens/SettingsMobile";
import { HistoryMobile } from "./screens/HistoryMobile";
import { FindProviderMobile } from "./screens/FindProviderMobile";
import { AboutMobile } from "./screens/AboutMobile";

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// AUTH GATE — Requires Supabase authentication
// ═══════════════════════════════════════════════════════════
const AuthGate = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setSubmitting(true);
    setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else if (data?.user) {
      logAuditEvent("auth.sign_in", "User signed in via AuthGate");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ fontSize: 14, color: "#64748b" }}>Loading...</div>
      </div>
    );
  }

  if (session) return children;

  return (
    <div style={{
      height: "100vh", background: "#f8fafc", fontFamily: "'Outfit', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{
        width: "100%", maxWidth: 360, background: "#fff", padding: 32, borderRadius: 24,
        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)", textAlign: "center"
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #38bdf8, #818cf8)",
          margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 20px rgba(56,189,248,0.25)"
        }}>
          {Icons.shield("#fff", 24)}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>AnonyHealth</h2>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>Sign in to access the platform.</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0",
            background: "#f1f5f9", fontSize: 14, marginBottom: 12, outline: "none",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${error ? "#ef4444" : "#e2e8f0"}`,
            background: "#f1f5f9", fontSize: 14, marginBottom: 12, outline: "none",
            transition: "all 0.2s"
          }}
        />
        {error && (
          <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{error}</div>
        )}
        <button onClick={handleLogin} disabled={submitting} style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: submitting ? "wait" : "pointer",
          background: "#0f172a", color: "#fff", fontSize: 14, fontWeight: 600,
          opacity: submitting ? 0.7 : 1
        }}>
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </div>
  );
};

export default function AnonyHealthApp() {
  return (
    <AuthGate>
      <AnonyHealthAppContent />
    </AuthGate>
  );
}

function AnonyHealthAppContent() {
  const [theme, setTheme] = useState("light");
  const [desktopScreen, setDesktopScreen] = useState("providers");
  const [mobileScreen, setMobileScreen] = useState("dashboard");
  const [chatInitialMsg, setChatInitialMsg] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(0);
  const [providers, setProviders] = useState(PROVIDERS); // Initialize with mock, update with DB
  const [session, setSession] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [viewMode, setViewMode] = useState(window.innerWidth < 1024 ? "mobile" : "split");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProviders = async () => {
      const { data, error } = await supabase.from('providers').select('*').order('id', { ascending: true });
      if (error) console.error("Error fetching providers:", error);
      else if (data && data.length > 0) setProviders(data);
    };
    fetchProviders();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setViewMode("mobile");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const t = T[theme];
  const isDark = theme === "dark";

  const renderMobile = () => {
    switch (mobileScreen) {
      case "dashboard": return <PatientDashboard theme={theme} onNavigate={(s, msg) => {
        if (msg) setChatInitialMsg(msg);
        else setChatInitialMsg("");
        setMobileScreen(s);
      }} />;
      case "findProvider": return <FindProviderMobile theme={theme} providers={providers} onSelectProvider={(i) => { setSelectedProvider(i); setMobileScreen("providerDetail"); }} />;
      case "providerDetail": return <ProviderDetailsMobile theme={theme} provider={selectedProvider} providers={providers} onBack={() => setMobileScreen("findProvider")} onStartAnon={() => setMobileScreen("anonReview")} />;
      case "anonReview": return <AnonReviewMobile theme={theme} onBack={() => setMobileScreen("providerDetail")} onConfirm={() => setMobileScreen("dashboard")} />;
      case "chat": return <AIChatMobile theme={theme} initialMsg={chatInitialMsg} onBack={() => setMobileScreen("dashboard")} onBook={() => setMobileScreen("findProvider")} />;
      case "register": return <RegisterMobile theme={theme} onBack={() => setMobileScreen("dashboard")} />;
      case "settings": return <SettingsMobile theme={theme} session={session} onNavigate={(s) => setMobileScreen(s)} onBack={() => setMobileScreen("dashboard")} />;
      case "about": return <AboutMobile theme={theme} onBack={() => setMobileScreen("dashboard")} />;
      case "history": return <HistoryMobile theme={theme} onBack={() => setMobileScreen("dashboard")} />;
      default: return <PatientDashboard theme={theme} onNavigate={(s) => setMobileScreen(s)} />;
    }
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

      {/* Top Bar */}
      {/* Top Bar - Hide on mobile */}
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
          <button onClick={() => setTheme(isDark ? "light" : "dark")} style={{
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
              <FindProviderDesktop theme={theme} providers={providers} onSelectProvider={(i) => { setSelectedProvider(i); setMobileScreen("providerDetail"); }} />
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
            <FindProviderDesktop theme={theme} providers={providers} onSelectProvider={(i) => { setSelectedProvider(i); setMobileScreen("providerDetail"); setViewMode("mobile"); }} />
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
