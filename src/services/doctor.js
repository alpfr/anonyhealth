import { supabase } from "../supabaseClient";
import { logAuditEvent } from "../utils/audit";

export async function listTenantPatients(tenantId) {
  // user_tenants and patient_profiles both reference auth.users independently,
  // so PostgREST cannot infer the relation. Fetch memberships then batch the
  // profiles by user_id.
  const { data: members, error: memberErr } = await supabase
    .from("user_tenants")
    .select("user_id, created_at")
    .eq("tenant_id", tenantId)
    .eq("role", "patient")
    .order("created_at", { ascending: false });
  if (memberErr) throw memberErr;
  const ids = (members ?? []).map((m) => m.user_id);
  if (ids.length === 0) return [];

  const { data: profiles, error: profileErr } = await supabase
    .from("patient_profiles")
    .select("id, full_name, dob, updated_at")
    .in("id", ids);
  if (profileErr) throw profileErr;

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return (members ?? []).map((m) => ({
    user_id: m.user_id,
    created_at: m.created_at,
    patient_profiles: byId.get(m.user_id) ?? null,
  }));
}

export async function getPatientHistory(tenantId, patientUserId) {
  const [{ data: profile, error: profileErr }, { data: logs, error: logsErr }] = await Promise.all([
    supabase.from("patient_profiles").select("*").eq("id", patientUserId).maybeSingle(),
    supabase
      .from("health_logs")
      .select("id, created_at, symptom, severity, ai_advice")
      .eq("tenant_id", tenantId)
      .eq("user_id", patientUserId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (profileErr) throw profileErr;
  if (logsErr) throw logsErr;

  // Every PHI read by a doctor is audited server-side via log-audit.
  await logAuditEvent("phi.read", `patient=${patientUserId}`);

  return { profile: profile ?? null, logs: logs ?? [] };
}
