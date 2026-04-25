import { supabase } from "../supabaseClient";

export async function getProviderProfile(tenantId) {
  if (!tenantId) return null;
  const { data, error } = await supabase
    .from("provider_profiles")
    .select("tenant_id, display_name, credentials, specialty, bio, avatar_url, scheduling_url, updated_at")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

function normalizeUrl(raw) {
  const v = raw?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export async function upsertProviderProfile(tenantId, fields) {
  const payload = {
    tenant_id: tenantId,
    display_name: fields.display_name?.trim() ?? "",
    credentials: fields.credentials?.trim() || null,
    specialty: fields.specialty?.trim() || null,
    bio: fields.bio?.trim() || null,
    avatar_url: normalizeUrl(fields.avatar_url),
    scheduling_url: normalizeUrl(fields.scheduling_url),
    updated_at: new Date().toISOString(),
  };
  if (!payload.display_name) return { error: "display_name is required" };

  const { data, error } = await supabase
    .from("provider_profiles")
    .upsert(payload, { onConflict: "tenant_id" })
    .select()
    .single();
  return { data, error };
}
