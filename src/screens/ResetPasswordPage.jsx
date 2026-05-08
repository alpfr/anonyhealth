// Landing page for the email-recovery link. Supabase delivers the user to
// /reset-password with a recovery token in the URL fragment; the supabase-js
// client picks it up via onAuthStateChange (PASSWORD_RECOVERY event) and the
// session ends up authenticated. The user then sets a new password.
//
// We intentionally do not auto-redirect after success — show a confirmation
// and a button so the user knows it worked.

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { isStrongPassword } from "../utils/validation";

export const ResetPasswordPage = () => {
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Two arrival paths:
    //  - magic recovery link → onAuthStateChange fires PASSWORD_RECOVERY
    //  - direct visit (no token) → there will be no session
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) setRecoveryReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setRecoveryReady(true);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  const submit = async () => {
    setError("");
    if (!isStrongPassword(password)) {
      setError("Password must be 8+ characters with uppercase, lowercase, and a digit.");
      return;
    }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) { setError(err.message || "Failed to update password."); return; }
    setDone(true);
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px", borderRadius: 12,
    border: "1px solid #e2e8f0", background: "#f1f5f9", color: "#0f172a",
    fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box",
    colorScheme: "light", WebkitTextFillColor: "#0f172a",
  };

  return (
    <div style={{
      height: "100vh", background: "#f8fafc", fontFamily: "'Outfit', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 380, background: "#fff", padding: 32, borderRadius: 24,
        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)",
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>
          {done ? "Password updated" : "Set a new password"}
        </h2>

        {!recoveryReady && !done && (
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
            This link is only valid for a short time. If it expired, request a new
            reset email from the sign-in page.
          </p>
        )}

        {recoveryReady && !done && (
          <>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
              Choose a strong password. You'll be signed in afterward.
            </p>
            <input type="password" autoComplete="new-password" placeholder="New password"
              value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            <input type="password" autoComplete="new-password" placeholder="Confirm password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()} style={inputStyle} />

            {error && <div role="alert" style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{error}</div>}

            <button onClick={submit} disabled={submitting} style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: "#0f172a", color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1,
            }}>
              {submitting ? "Updating..." : "Update password"}
            </button>
          </>
        )}

        {done && (
          <>
            <p style={{ fontSize: 13, color: "#16a34a", marginBottom: 16 }}>
              Your password was updated. You're now signed in.
            </p>
            <button onClick={() => { window.location.href = "/"; }} style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              background: "#0f172a", color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
            }}>
              Continue to AnonyHealth
            </button>
          </>
        )}
      </div>
    </div>
  );
};
