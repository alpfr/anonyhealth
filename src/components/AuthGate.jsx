import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import { logAuditEvent } from "../utils/audit";
import { isValidEmail, isStrongPassword } from "../utils/validation";
import { extractInviteToken, goToInvite } from "../utils/inviteToken";
import { Icons } from "../constants/theme";

/**
 * AuthGate — three-tier access gate.
 *
 * Modes (controlled by `tier` prop):
 *   • "anonymous_ok" — auto-creates an anonymous Supabase session so the
 *                       visitor can use AI triage immediately. Renders the
 *                       sign-in/sign-up form only on explicit /signin or
 *                       /signup routes.
 *   • "required"     — gates on a real (non-anonymous) account, matching the
 *                       pre-tiered behavior. Used for provider routes.
 *
 * The auth form supports four modes internally: signin, signup, verify, forgot.
 * Sign-up uses `upgradeAnonymousToAccount` so anonymous chat history carries
 * over when a visitor decides to create a real account.
 */
export const AuthGate = ({
  children,
  initialMode = "signin",
  tier = "anonymous_ok",
}) => {
  const {
    session,
    loading,
    isAnonymous,
    signIn,
    signInAnonymously,
    upgradeAnonymousToAccount,
    requestPasswordReset,
  } = useAuth();

  const [mode, setMode] = useState(initialMode); // signin | signup | verify | forgot
  // Audience selector — patient vs provider — controls helper copy and
  // secondary CTAs. The form fields and backend logic are identical for
  // both; the role only affects which conversion path makes sense.
  // Persisted in sessionStorage so it survives the tab refresh after sign-up.
  const [role, setRole] = useState(() => {
    if (typeof window === "undefined") return "patient";
    return sessionStorage.getItem("anonyhealth.signinRole") || "patient";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  // Patient signups happen via invite link, not direct signup. When a
  // fresh visitor (not anonymous) chooses the patient role on /signup, we
  // show this input instead of email/password.
  const [inviteInput, setInviteInput] = useState("");

  const updateRole = (next) => {
    setRole(next);
    try {
      sessionStorage.setItem("anonyhealth.signinRole", next);
    } catch {
      /* sessionStorage unavailable — non-fatal */
    }
  };

  const explicitAuthForm = initialMode === "signin" || initialMode === "signup";
  // When the route is /signin or /signup the visitor explicitly asked for
  // the auth form — don't auto-anonymize them.
  // The "landing" mode is opt-in: a separate route or query param would
  // set it. By default (`/` with no session) we auto-anonymize.
  const willShowLandingFirst = false; // future use; keep landing reachable via /landing if needed

  // Anonymous bootstrap: if tier allows anonymous and there's no session,
  // create one in the background — except on explicit auth routes.
  useEffect(() => {
    if (loading) return;
    if (session) return;
    if (tier !== "anonymous_ok") return;
    if (explicitAuthForm) return;
    if (willShowLandingFirst) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBootstrapping(true);
    signInAnonymously().finally(() => {
      if (!cancelled) setBootstrapping(false);
    });
    return () => { cancelled = true; };
  }, [loading, session, tier, explicitAuthForm, willShowLandingFirst, signInAnonymously]);

  const resetMessages = () => {
    setError("");
    setInfo("");
  };

  const handleForgotPassword = useCallback(async () => {
    resetMessages();
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
    // Use the auth context's upgrade path so existing anonymous data
    // (chat history, draft profile) carries over to the new account.
    const { data, error: signUpError } = await upgradeAnonymousToAccount(email, password);
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data?.session || data?.user) {
      // If Supabase email confirmation is enabled, the user object exists
      // but they still need to confirm. Tell them.
      const needsVerify = !data.session;
      if (needsVerify) {
        setMode("verify");
        setInfo(
          "We sent a 6-digit code to your email. Enter it below to finish creating your account."
        );
      }
    }
  }, [email, password, upgradeAnonymousToAccount]);

  /**
   * Parse a pasted invite URL or token, then navigate to /invite/<token>
   * where AcceptInviteMobile takes over with the normal flow.
   */
  const handleUseInvite = useCallback(() => {
    resetMessages();
    const token = extractInviteToken(inviteInput);
    if (!token) {
      setError("That doesn't look like a valid invite link. It should look like /invite/<token> or be a token you received.");
      return;
    }
    goToInvite(token);
  }, [inviteInput]);

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
      type: isAnonymous ? "email_change" : "signup",
    });
    setSubmitting(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    if (data?.user) logAuditEvent("auth.sign_up", "Email OTP verified");
  }, [email, otp, isAnonymous]);

  const resendOtp = useCallback(async () => {
    resetMessages();
    setSubmitting(true);
    const { error: resendError } = await supabase.auth.resend({
      type: isAnonymous ? "email_change" : "signup",
      email,
    });
    setSubmitting(false);
    if (resendError) setError(resendError.message);
    else setInfo("Code resent. Check your inbox.");
  }, [email, isAnonymous]);

  // ─── Render states ─────────────────────────────────────
  if (loading || bootstrapping) {
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

  // For tier="required", an anonymous session does NOT satisfy the gate.
  const sessionSatisfiesTier =
    !!session && (tier === "anonymous_ok" || !isAnonymous);

  if (sessionSatisfiesTier) return children;

  // No session AND we got here — show the auth form (the bootstrap effect
  // either hasn't run yet or we're on an explicit /signin or /signup).
  if (!session && !explicitAuthForm && tier === "anonymous_ok") {
    // Bootstrap effect is starting — show a loader.
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
        <div style={{ fontSize: 14, color: "#64748b" }}>Starting session...</div>
      </div>
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

  // Determine the helper copy at the top of the form.
  // Two axes influence the copy:
  //   • upgrading — true if the visitor has an active anonymous session
  //   • role — patient vs provider (selected via the audience toggle)
  const upgrading = isAnonymous;
  const isProviderRole = role === "provider";

  const signUpHeading = upgrading
    ? "Save your session"
    : isProviderRole
      ? "Create provider account"
      : "Create your account";

  const signUpHelper = upgrading
    ? "Create an account to save your triage history, book appointments, and message providers."
    : isProviderRole
      ? "Healthcare providers: create your practice and invite your patients."
      : "Patients normally join through an invite link from their provider. If you have a link, open it now.";

  const signInHelper = isProviderRole
    ? "Sign in to your provider dashboard."
    : "Sign in to access your saved triage history and appointments.";

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
            {/* Audience selector — patient vs provider. Hidden when upgrading
                from an anonymous session (the visitor's intent is implicit). */}
            {!upgrading && (
              <div
                role="tablist"
                aria-label="I am a"
                style={{
                  display: "flex",
                  gap: 4,
                  padding: 4,
                  borderRadius: 12,
                  background: "#f1f5f9",
                  marginBottom: 16,
                }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={role === "patient"}
                  onClick={() => updateRole("patient")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif",
                    background: role === "patient" ? "#fff" : "transparent",
                    color: role === "patient" ? "#0f172a" : "#64748b",
                    boxShadow: role === "patient" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  I'm a patient
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={role === "provider"}
                  onClick={() => updateRole("provider")}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif",
                    background: role === "provider" ? "#fff" : "transparent",
                    color: role === "provider" ? "#0f172a" : "#64748b",
                    boxShadow: role === "provider" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    transition: "all 0.15s",
                  }}
                >
                  I'm a provider
                </button>
              </div>
            )}

            <p
              style={{
                fontSize: 12,
                color: "#64748b",
                marginBottom: 16,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              {mode === "signup" ? signUpHelper : signInHelper}
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
                Sign in
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
                {upgrading ? "Save session" : "Sign up"}
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
            {/* Patient signups happen via invite link, not direct form.
                Fresh visitors (not anonymous) on /signup with patient role
                see invite-link UI instead of email/password.
                Anonymous users upgrading: existing email/password works as before. */}
            {mode === "signup" && !upgrading && !isProviderRole ? (
              <>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    marginBottom: 16,
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#0f172a",
                      marginBottom: 4,
                    }}
                  >
                    Patients join through an invite link
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                    Your provider sends you a link that connects your account to their practice. If you have one, paste it below.
                  </div>
                </div>

                <input
                  type="text"
                  className="auth-input"
                  placeholder="Paste invite link or token"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUseInvite()}
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

                <button
                  onClick={handleUseInvite}
                  disabled={!inviteInput.trim() || submitting}
                  style={{
                    ...primaryBtn(submitting),
                    opacity: inviteInput.trim() ? 1 : 0.5,
                    cursor: inviteInput.trim() ? "pointer" : "default",
                  }}
                >
                  Use invite
                </button>

                {/* Two alternative paths for visitors without an invite */}
                <div
                  style={{
                    marginTop: 18,
                    paddingTop: 16,
                    borderTop: "1px solid #e2e8f0",
                    fontSize: 12,
                    color: "#64748b",
                    textAlign: "center",
                    lineHeight: 1.6,
                  }}
                >
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("signin"); resetMessages(); }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#38bdf8",
                      cursor: "pointer",
                      fontSize: 12,
                      padding: 0,
                      fontWeight: 600,
                    }}
                  >
                    Sign in
                  </button>
                  <br />
                  Just want to try AI triage?{" "}
                  <button
                    type="button"
                    onClick={async () => {
                      await signInAnonymously();
                      window.location.href = "/";
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#38bdf8",
                      cursor: "pointer",
                      fontSize: 12,
                      padding: 0,
                      fontWeight: 600,
                    }}
                  >
                    Continue anonymously
                  </button>
                </div>
              </>
            ) : (
              <form
                autoComplete="on"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (mode === "signin") handleSignIn();
                  else handleSignUp();
                }}
              >
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="auth-input"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  type="submit"
                  disabled={submitting}
                  style={primaryBtn(submitting)}
                >
                  {submitting
                    ? mode === "signin"
                      ? "Signing in..."
                      : "Creating account..."
                    : mode === "signin"
                      ? "Sign In"
                      : signUpHeading}
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

                {/* Anonymous escape hatch — let patient visitors browse without
                    an account. Hidden for providers (they have no use case for
                    anonymous mode). */}
                {tier === "anonymous_ok" && !session && !isProviderRole && (
                  <button
                    type="button"
                    onClick={async () => {
                      await signInAnonymously();
                      window.location.href = "/";
                    }}
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: "1px solid #e2e8f0",
                      background: "none",
                      borderLeft: "none",
                      borderRight: "none",
                      borderBottom: "none",
                      color: "#0f172a",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      width: "100%",
                    }}
                  >
                    Continue anonymously →
                  </button>
                )}

                <a
                  href="/simulation.html"
                  style={{
                    display: "block",
                    marginTop: 12,
                    color: "#2563eb",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                    textAlign: "center",
                  }}
                >
                  🎮 Interactive Clinical Simulator & Demo →
                </a>

                {/* Provider-specific helper link. */}
                {isProviderRole && mode === "signin" && (
                  <a
                    href="/for-providers"
                    style={{
                      display: "block",
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: "1px solid #e2e8f0",
                      color: "#64748b",
                      fontSize: 12,
                      textDecoration: "none",
                      textAlign: "center",
                    }}
                  >
                    What is AnonyHealth for providers? →
                  </a>
                )}
              </form>
            )}
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
