import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";

const TenantContext = createContext(null);

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export const TenantProvider = ({ children }) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState(null);   // { tenant_id, role }
  const [tenant, setTenant] = useState(null);           // { id, name }
  const [subscription, setSubscription] = useState(null); // { status, current_period_end, ... }

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setMembership(null);
      setTenant(null);
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: memberships } = await supabase
        .from("user_tenants")
        .select("tenant_id, role")
        .eq("user_id", session.user.id)
        .limit(1);

      const m = memberships?.[0] ?? null;
      setMembership(m);

      if (!m) {
        setTenant(null);
        setSubscription(null);
        return;
      }

      const [{ data: t }, { data: s }] = await Promise.all([
        supabase.from("tenants").select("id, name, deleted_at").eq("id", m.tenant_id).maybeSingle(),
        supabase.from("subscriptions").select("status, current_period_end, cancel_at, trial_end").eq("tenant_id", m.tenant_id).maybeSingle(),
      ]);

      setTenant(t ?? null);
      setSubscription(s ?? null);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => ({
    loading,
    membership,
    tenant,
    subscription,
    role: membership?.role ?? null,
    isDoctor: membership?.role === "doctor",
    isPatient: membership?.role === "patient",
    hasActiveSubscription: !!subscription && ACTIVE_STATUSES.has(subscription.status),
    refresh,
  }), [loading, membership, tenant, subscription, refresh]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within a TenantProvider");
  return ctx;
};
