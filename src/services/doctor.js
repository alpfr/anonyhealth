import { supabase } from "../supabaseClient";
import { logAuditEvent } from "../utils/audit";

export async function listTenantPatients(tenantId) {
  // user_tenants + patient_profiles are both RLS-scoped to this tenant.
  const { data, error } = await supabase
    .from("user_tenants")
    .select("user_id, created_at, patient_profiles:patient_profiles!patient_profiles_id_fkey(id, full_name, dob, updated_at)")
    .eq("tenant_id", tenantId)
    .eq("role", "patient")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
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
