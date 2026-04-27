import { supabase } from "../supabaseClient";

export async function getPatientProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("patient_profiles")
    .select("id, full_name, dob, address, consented_at, tenant_id, updated_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function createPatientProfile(userId, tenantId, fields) {
  const full_name = fields.full_name?.trim() ?? "";
  const dob = fields.dob || null;
  const address = fields.address?.trim() ?? "";
  if (!full_name) return { error: { message: "Full name is required." } };
  if (!dob) return { error: { message: "Date of birth is required." } };
  if (!address) return { error: { message: "Address is required." } };

  const payload = {
    id: userId,
    tenant_id: tenantId,
    full_name,
    dob,
    address,
    consented_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("patient_profiles")
    .insert(payload)
    .select()
    .single();
  return { data, error };
}
