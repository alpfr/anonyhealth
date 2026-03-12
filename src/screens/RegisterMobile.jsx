import { useState } from "react";
import { supabase } from "../supabaseClient";
import { T } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";
import { logAuditEvent } from "../utils/audit";

// ═══════════════════════════════════════════════════════════
// SCREEN: REGISTER AS PATIENT (MOBILE)
// ═══════════════════════════════════════════════════════════
export const RegisterMobile = ({ theme, onBack }) => {
  const t = T[theme];
  const isDark = theme === "dark";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [msg, setMsg] = useState("");

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateDob = (dob) => /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/.test(dob);
  const validatePassword = (pw) => pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);

  const handleAuth = async () => {
    if (!email || !password) {
      setMsg("Please enter both email and password.");
      return;
    }
    if (!validateEmail(email)) {
      setMsg("Please enter a valid email address.");
      return;
    }
    if (!isLogin && !validatePassword(password)) {
      setMsg("Password must be at least 8 characters with uppercase, lowercase, and a number.");
      return;
    }
    if (!isLogin && (!name || !dob || !address)) {
      setMsg("Please complete all fields for identity verification.");
      return;
    }
    if (!isLogin && !validateDob(dob)) {
      setMsg("Please enter date of birth in MM/DD/YYYY format.");
      return;
    }

    setLoading(true);
    setMsg("");

    const { data, error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    // On sign-up, store PII in separate RLS-protected table (not auth metadata)
    if (!isLogin && data?.user) {
      const { error: profileError } = await supabase.from('patient_profiles').insert({
        id: data.user.id,
        full_name: name.trim(),
        dob: dob,
        address: address.trim(),
        consented_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        setMsg("Account created but profile save failed. Please contact support.");
        setLoading(false);
        return;
      }

      logAuditEvent("auth.sign_up", "New patient registered with consent");
      setMsg("Success! Please check your email to confirm.");
    } else if (isLogin && data?.user) {
      logAuditEvent("auth.sign_in", "User signed in via registration page");
      setMsg("Welcome back!");
      setTimeout(() => onBack(), 800);
    }

    setLoading(false);
  };

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 30,
          fontWeight: 400, color: t.text, margin: "0 0 8px", letterSpacing: "-0.02em",
        }}>
          {isLogin ? "Welcome back" : "Confidential Registration"}
        </h1>
        <p style={{ fontSize: 13.5, color: t.textSec, fontFamily: "'Outfit', sans-serif", margin: "0 0 24px", lineHeight: 1.5 }}>
          {isLogin ? "Sign in to access your dashboard." : "Maryland law requires identity verification for telehealth. We strictly protect this data and do not bill insurance."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          {!isLogin && (
            <>
              <input
                placeholder="Legal Name (for verification)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  padding: "14px", borderRadius: 12, border: `1px solid ${t.border}`,
                  background: t.bgInput, color: t.text, fontSize: 15, fontFamily: "'Outfit', sans-serif", outline: "none",
                }}
              />
              <input
                placeholder="Date of Birth (MM/DD/YYYY)"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                style={{
                  padding: "14px", borderRadius: 12, border: `1px solid ${t.border}`,
                  background: t.bgInput, color: t.text, fontSize: 15, fontFamily: "'Outfit', sans-serif", outline: "none",
                }}
              />
              <input
                placeholder="Home Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  padding: "14px", borderRadius: 12, border: `1px solid ${t.border}`,
                  background: t.bgInput, color: t.text, fontSize: 15, fontFamily: "'Outfit', sans-serif", outline: "none",
                }}
              />
              <div style={{ fontSize: 12, color: t.textMut, fontFamily: "'Outfit', sans-serif", padding: "0 4px" }}>
                * By registering, I consent to telehealth services and affirm my identity is accurate.
              </div>
            </>
          )}

          <input
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "14px", borderRadius: 12, border: `1px solid ${t.border}`,
              background: t.bgInput, color: t.text, fontSize: 15, fontFamily: "'Outfit', sans-serif",
              outline: "none",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "14px", borderRadius: 12, border: `1px solid ${t.border}`,
              background: t.bgInput, color: t.text, fontSize: 15, fontFamily: "'Outfit', sans-serif",
              outline: "none",
            }}
          />
        </div>

        {msg && (
          <div style={{
            marginBottom: 20, padding: 12, borderRadius: 8,
            background: msg.includes("Success") || msg.includes("Welcome") ? t.successBg : t.dangerBg,
            color: msg.includes("Success") || msg.includes("Welcome") ? t.success : t.danger,
            fontSize: 13, fontFamily: "'Outfit', sans-serif",
          }}>
            {msg}
          </div>
        )}

        <button onClick={handleAuth} disabled={loading} style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: loading ? "wait" : "pointer",
          background: t.gradient, color: "#fff", fontSize: 15, fontWeight: 600,
          fontFamily: "'Outfit', sans-serif", marginBottom: 16, opacity: loading ? 0.7 : 1,
          boxShadow: isDark ? `0 0 20px ${t.accent}25` : `0 4px 16px ${t.accent}15`,
        }}>
          {loading ? "Processing..." : (isLogin ? "Sign In" : "Register & Consent")}
        </button>

        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: 14, color: t.textSec, fontFamily: "'Outfit', sans-serif" }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button onClick={() => { setIsLogin(!isLogin); setMsg(""); }} style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontSize: 14, fontWeight: 600, color: t.accent, fontFamily: "'Outfit', sans-serif",
          }}>
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </div>
    </>
  );
};
