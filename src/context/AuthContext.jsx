import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { logAuditEvent } from "../utils/audit";

const AuthContext = createContext(null);

/**
 * AuthProvider — centralizes session management and auth operations.
 *
 * Supports three identity tiers:
 *   1. Anonymous   — Supabase anonymous session, no email, ephemeral
 *   2. Patient     — email/password, optionally upgraded from anonymous
 *   3. Provider    — email/password, owns or belongs to a tenant
 *
 * Anonymous → patient/provider conversion preserves user_id, so any data
 * created during the anonymous session (e.g. chat history) carries over.
 */
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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

  /**
   * Whether the current session is a Supabase anonymous user.
   * Supabase sets `is_anonymous: true` on the user object for these sessions.
   */
  const isAnonymous = useMemo(
    () => !!session?.user?.is_anonymous,
    [session]
  );

  /** Start a Supabase anonymous session. Idempotent — no-ops if already signed in. */
  const signInAnonymously = useCallback(async () => {
    // Don't recreate a session if one already exists.
    const current = await supabase.auth.getSession();
    if (current.data.session) {
      return { data: current.data, error: null };
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (!error && data?.user) {
      logAuditEvent("auth.anon_sign_in", "Anonymous session started");
    }
    return { data, error };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
      logAuditEvent("auth.sign_in", "User signed in");
    }
    return { data, error };
  }, []);

  /**
   * Convert the current anonymous session into a real account, preserving
   * user_id (and therefore any anonymous-created data). If no anonymous
   * session is active, falls back to a regular signUp.
   *
   * Uses `updateUser({ email, password })` per Supabase's recommended pattern
   * for anonymous → permanent conversion.
   */
  const upgradeAnonymousToAccount = useCallback(async (email, password) => {
    if (!isAnonymous) {
      // No anonymous session — just regular sign up.
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (!error && data?.user) {
        logAuditEvent("auth.sign_up", "New user registered (no prior anon session)");
      }
      return { data, error };
    }

    // Set the email first; Supabase will send a confirmation if email
    // confirmations are enabled, otherwise the linkage is immediate.
    const { error: emailError } = await supabase.auth.updateUser({ email });
    if (emailError) return { data: null, error: emailError };

    // Then attach the password.
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) return { data: null, error };

    logAuditEvent("auth.upgrade_anon", "Anonymous session upgraded to permanent account");
    return { data, error: null };
  }, [isAnonymous]);

  const signUp = useCallback(async (email, password) => {
    // Public API used by the provider sign-up form — wraps the upgrade path
    // so provider signups also benefit from any pre-existing anon session.
    return upgradeAnonymousToAccount(email, password);
  }, [upgradeAnonymousToAccount]);

  const signOut = useCallback(async () => {
    logAuditEvent("auth.sign_out", "User signed out");
    return await supabase.auth.signOut();
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    const redirectTo = `${window.location.origin}/reset-password`;
    return await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    return await supabase.auth.updateUser({ password: newPassword });
  }, []);

  const value = useMemo(() => ({
    session,
    loading,
    user: session?.user ?? null,
    isAnonymous,
    signIn,
    signUp,
    signInAnonymously,
    upgradeAnonymousToAccount,
    signOut,
    requestPasswordReset,
    updatePassword,
  }), [
    session, loading, isAnonymous,
    signIn, signUp, signInAnonymously, upgradeAnonymousToAccount,
    signOut, requestPasswordReset, updatePassword,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
