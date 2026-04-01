import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { logAuditEvent } from "../utils/audit";

const AuthContext = createContext(null);

/**
 * AuthProvider — centralizes session management and auth operations.
 * Eliminates duplicate getSession/onAuthStateChange subscriptions.
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

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.user) {
      logAuditEvent("auth.sign_in", "User signed in");
    }
    return { data, error };
  }, []);

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data?.user) {
      logAuditEvent("auth.sign_up", "New user registered");
    }
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    logAuditEvent("auth.sign_out", "User signed out");
    return await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({
    session,
    loading,
    user: session?.user ?? null,
    signIn,
    signUp,
    signOut,
  }), [session, loading, signIn, signUp, signOut]);

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
