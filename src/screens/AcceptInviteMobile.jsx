import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import { T } from "../constants/theme";
import { callFunction } from "../utils/functions";
import { isValidEmail, isValidPassword } from "../utils/validation";

export const AcceptInviteMobile = ({ theme, token, onJoined }) => {
  const t = T[theme];
  const { session, signIn, signUp } = useAuth();
  const { refresh: refreshTenant } = useTenant();
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const redeem = useCallback(async () => {
    setRedeeming(true);
    setError("");
    try {
      await callFunction("accept-patient-invite", { token });
      await refreshTenant();
      onJoined?.();
    } catch (e) {
      setError(e.message || "Unable to redeem invite.");
      setRedeeming(false);
    }
  }, [token, refreshTenant, onJoined]);

  // Auto-redeem once the user is authenticated.
  useEffect(() => {
    if (session?.user && !redeeming) redeem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  const submit = async () => {
    if (!isValidEmail(email)) { setError("Please enter a valid email."); return; }
    if (!isValidPassword(password)) { setError("Password must be at least 6 characters."); return; }

    setSubmitting(true);
    setError("");
    const fn = mode === "signup" ? signUp : signIn;
    const { error: authErr } = await fn(email, password);
    setSubmitting(false);
    if (authErr) setError(authErr.message);
    // useEffect above will redeem once session is set.
  };

  if (session?.user) {
    return (
      <div style={{ flex: 1, padding: 32, background: t.bg, color: t.text, fontFamily: "'Outfit', sans-serif" }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Joining practice...</h1>
        {error && <p style={{ color: "#dc2626", marginTop: 12 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, padding: "32px 24px", background: t.bg, color: t.text, fontFamily: "'Outfit', sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>You're invited</h1>
      <p style={{ color: t.textSec, fontSize: 14, marginTop: 8 }}>
        {mode === "signup" ? "Create an account to accept this invitation." : "Sign in to accept this invitation."}
      </p>

      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
        style={{ marginTop: 20, padding: "12px 14px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgNav, color: t.text, fontSize: 15 }} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
        style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.bgNav, color: t.text, fontSize: 15 }} />

      {error && <div style={{ marginTop: 12, color: "#dc2626", fontSize: 13 }}>{error}</div>}

      <button onClick={submit} disabled={submitting}
        style={{ marginTop: 20, padding: "14px 16px", borderRadius: 12, border: "none", background: t.accent, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
        {submitting ? "Please wait..." : (mode === "signup" ? "Create account" : "Sign in")}
      </button>

      <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        style={{ marginTop: 12, padding: 8, background: "none", border: "none", color: t.accent, fontSize: 13, cursor: "pointer" }}>
        {mode === "signup" ? "I already have an account" : "Create a new account"}
      </button>
    </div>
  );
};
