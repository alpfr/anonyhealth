import { useState, useCallback, lazy, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import { logAuditEvent } from "../utils/audit";
import { isValidEmail, isStrongPassword } from "../utils/validation";
import { Icons } from "../constants/theme";

const LandingPage = lazy(() =>
  import("../screens/LandingPage").then((m) => ({ default: m.LandingPage }))
);

/**
 * AuthGate — wraps the app in an auth wall.
 *
 * When there is no active session it renders one of:
 *   • The public LandingPage (if showLanding is true)
 *   • A sign-in / sign-up / OTP-verify / forgot-password form
 *
 * Once a session exists it renders `children`.
 */
export const AuthGate = ({
  children,
  initialMode = "signin",
  showLanding = false,
}) => {
  const { session, loading, signIn, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState(initialMode); // signin | signup | verify | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetMessages = () => {
    setError("");
    setInfo("");
  };

  const handleForgotPassword = useCallback(async () => {
    setError("");
    setInfo("");
    if (!isValidEmail(email)) {
      setError("Please enter your email.");
      return;
    }
    setSubmitting(true);
    const { error: resetErr } = await requestPasswordReset(email);
    setSubmitting(false);
    if (resetErr) {
      setError(resetErr.message);
      return;
    }
    setInfo("If an account exists for that email, a reset link is on its way.");
  }, [email, requestPasswordReset]);

  const handleSignIn = useCallback(async () => {
    resetMessages();
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

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
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!isStrongPassword(password)) {
      setError(
        "Password must be 8+ characters and include uppercase, lowercase, and a digit."
      );
      return;
    }

    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // When email confirmation is enabled, Supabase returns a user with no
    // session and emails a 6-digit OTP (if the project's confirmation email
    // template uses {{ .Token }}). Prompt for it.
    if (data?.session) {
      logAuditEvent(
        "auth.sign_up",
        "User signed up (no confirmation required)"
      );
      return;
    }
    setMode("verify");
    setInfo(
      "We sent a 6-digit code to your email. Enter it below to finish creating your account."
    );
  }, [email, password]);

  const handleVerifyOtp = useCallback(async () => {
    resetMessages();
    const token = otp.trim();
    if (!/^\d{6}$/.test(token)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setSubmitting(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });
    setSubmitting(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    if (data?.user) logAuditEvent("auth.sign_up", "Email OTP verified");
  }, [email, otp]);

  const resendOtp = useCallback(async () => {
    resetMessages();
    setSubmitting(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setSubmitting(false);
    if (resendError) setError(resendError.message);
    else setInfo("Code resent. Check your inbox.");
  }, [email]);

  // ─── Render states ─────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <div style={{ fontSize: 14, color: "#64748b" }}>Loading...</div>
      </div>
    );
  }

  if (session) return children;

  if (showLanding) {
    return (
      <Suspense fallback={null}>
        <LandingPage
          onPrimaryAction={() => {
            window.location.href = "/signup";
          }}
          onSignIn={() => {
            window.location.href = "/signin";
          }}
        />
      </Suspense>
    );
  }

  // ─── Auth form ─────────────────────────────────────────
  const activeTabStyle = {
    borderBottom: "2px solid #0f172a",
    color: "#0f172a",
    fontWeight: 600,
  };
  const inactiveTabStyle = {
    borderBottom: "2px solid transparent",
    color: "#64748b",
    fontWeight: 500,
  };
  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: "#f1f5f9",
    color: "#0f172a",
    fontSize: 14,
    marginBottom: 12,
    outline: "none",
    boxSizing: "border-box",
    colorScheme: "light",
    WebkitTextFillColor: "#0f172a",
  };
  const primaryBtn = (busy) => ({
    width: "100%",
    padding: "14px",
    borderRadius: 12,
    border: "none",
    cursor: busy ? "wait" : "pointer",
    background: "#0f172a",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    opacity: busy ? 0.7 : 1,
  });

  return (
    <div
      style={{
        height: "100vh",
        background: "#f8fafc",
        fontFamily: "'Outfit', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <style>{`
        .auth-input { color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; caret-color: #0f172a; }
        .auth-input::placeholder { color: #94a3b8; opacity: 1; }
        .auth-input:-webkit-autofill,
        .auth-input:-webkit-autofill:hover,
        .auth-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #0f172a !important;
          -webkit-box-shadow: 0 0 0 100px #f1f5f9 inset !important;
          caret-color: #0f172a;
        }
      `}</style>
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: "#fff",
          padding: 32,
          borderRadius: 24,
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "linear-gradient(135deg, #38bdf8, #818cf8)",
            margin: "0 auto 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 20px rgba(56,189,248,0.25)",
          }}
        >
          {Icons.shield("#fff", 24)}
        </div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: 20,
          }}
        >
          AnonyHealth
        </h2>

        {mode !== "verify" && mode !== "forgot" && (
          <>
            <p
              style={{
                fontSize: 12,
                color: "#64748b",
                marginBottom: 16,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              For healthcare providers. Patients join through an invite link
              from their provider.
            </p>
            <div
              style={{
                display: "flex",
                gap: 0,
                marginBottom: 20,
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  resetMessages();
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  ...(mode === "signin" ? activeTabStyle : inactiveTabStyle),
                }}
              >
                Provider sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  resetMessages();
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  ...(mode === "signup" ? activeTabStyle : inactiveTabStyle),
                }}
              >
                Sign up as provider
              </button>
            </div>
          </>
        )}

        {mode === "forgot" ? (
          <>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#0f172a",
                margin: "0 0 8px",
              }}
            >
              Reset your password
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "#64748b",
                marginBottom: 16,
                textAlign: "left",
              }}
            >
              Enter your email and we'll send you a reset link.
            </p>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              className="auth-input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
              style={inputStyle}
            />

            {error && (
              <div
                role="alert"
                style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}
              >
                {error}
              </div>
            )}
            {info && (
              <div style={{ fontSize: 13, color: "#16a34a", marginBottom: 12 }}>
                {info}
              </div>
            )}

            <button
              onClick={handleForgotPassword}
              disabled={submitting}
              style={primaryBtn(submitting)}
            >
              {submitting ? "Sending..." : "Send reset link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                resetMessages();
              }}
              style={{
                marginTop: 12,
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                fontSize: 13,
                padding: 0,
              }}
            >
              Back to sign in
            </button>
          </>
        ) : mode === "verify" ? (
          <>
            <p
              style={{
                fontSize: 13,
                color: "#64748b",
                marginBottom: 16,
                textAlign: "left",
              }}
            >
              {info}
            </p>
            <input
              className="auth-input"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              style={{
                ...inputStyle,
                letterSpacing: "0.5em",
                textAlign: "center",
                fontSize: 18,
              }}
            />
            {error && (
              <div
                role="alert"
                style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}
              >
                {error}
              </div>
            )}
            <button
              onClick={handleVerifyOtp}
              disabled={submitting}
              style={primaryBtn(submitting)}
            >
              {submitting ? "Verifying..." : "Verify"}
            </button>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <button
                type="button"
                onClick={resendOtp}
                disabled={submitting}
                style={{
                  background: "none",
                  border: "none",
                  color: "#38bdf8",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setOtp("");
                  resetMessages();
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Use a different email
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              className="auth-input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (mode === "signin" ? handleSignIn() : handleSignUp())
              }
              style={inputStyle}
            />
            <input
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              className="auth-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                (mode === "signin" ? handleSignIn() : handleSignUp())
              }
              style={{
                ...inputStyle,
                border: `1px solid ${error ? "#ef4444" : "#e2e8f0"}`,
              }}
            />

            {mode === "signup" && (
              <div
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  marginBottom: 12,
                  textAlign: "left",
                }}
              >
                Min 8 characters, with uppercase, lowercase, and a digit.
              </div>
            )}

            {error && (
              <div
                role="alert"
                style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}
              >
                {error}
              </div>
            )}
            {info && (
              <div style={{ fontSize: 13, color: "#16a34a", marginBottom: 12 }}>
                {info}
              </div>
            )}

            <button
              onClick={mode === "signin" ? handleSignIn : handleSignUp}
              disabled={submitting}
              style={primaryBtn(submitting)}
            >
              {submitting
                ? mode === "signin"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "signin"
                  ? "Sign In"
                  : "Create provider account"}
            </button>

            {mode === "signin" && (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  resetMessages();
                }}
                style={{
                  marginTop: 12,
                  background: "none",
                  border: "none",
                  color: "#38bdf8",
                  cursor: "pointer",
                  fontSize: 13,
                  padding: 0,
                }}
              >
                Forgot your password?
              </button>
            )}

            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid #e2e8f0",
                fontSize: 12,
                color: "#64748b",
              }}
            >
              Patient with an invite? Open the link your provider sent you.
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 18,
            fontSize: 11,
            color: "#94a3b8",
            display: "flex",
            gap: 12,
            justifyContent: "center",
          }}
        >
          <a href="/terms" style={{ color: "#94a3b8", textDecoration: "none" }}>
            Terms
          </a>
          <span>·</span>
          <a
            href="/privacy"
            style={{ color: "#94a3b8", textDecoration: "none" }}
          >
            Privacy
          </a>
          <span>·</span>
          <a href="/hipaa" style={{ color: "#94a3b8", textDecoration: "none" }}>
            HIPAA
          </a>
        </div>
      </div>
    </div>
  );
};
