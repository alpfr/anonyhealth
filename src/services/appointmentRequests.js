import { supabase } from "../supabaseClient";
import { callFunction } from "../utils/functions";
import { logAuditEvent } from "../utils/audit";

const COLUMNS = "id, tenant_id, patient_user_id, preferred_date, preferred_window, reason, urgency, status, proposed_at, provider_note, created_at, updated_at";

export async function createAppointmentRequest(tenantId, patientUserId, fields) {
  const reason = fields.reason?.trim() ?? "";
  if (!reason) return { error: { message: "Reason is required." } };
  if (!fields.preferred_date) return { error: { message: "Preferred date is required." } };
  if (!["morning", "afternoon", "evening"].includes(fields.preferred_window)) {
    return { error: { message: "Preferred window is required." } };
  }
  if (!["routine", "this_week", "asap"].includes(fields.urgency)) {
    return { error: { message: "Urgency is required." } };
  }

  const { data, error } = await supabase
    .from("appointment_requests")
    .insert({
      tenant_id: tenantId,
      patient_user_id: patientUserId,
      preferred_date: fields.preferred_date,
      preferred_window: fields.preferred_window,
      reason,
      urgency: fields.urgency,
    })
    .select(COLUMNS)
    .single();
  if (error) return { error };
  logAuditEvent("appointment.request", `request=${data.id}`);
  // Fire-and-forget the email — UI shouldn't block on it.
  callFunction("send-appointment-email", { request_id: data.id, kind: "request" })
    .catch((e) => console.warn("send-appointment-email failed:", e.message));
  return { data };
}

export async function listMyAppointmentRequests(patientUserId) {
  const { data, error } = await supabase
    .from("appointment_requests")
    .select(COLUMNS)
    .eq("patient_user_id", patientUserId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function listTenantAppointmentRequests(tenantId) {
  const { data, error } = await supabase
    .from("appointment_requests")
    .select(COLUMNS)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

async function patchAndNotify(requestId, patch, kind, auditEvent) {
  const { data, error } = await supabase
    .from("appointment_requests")
    .update(patch)
    .eq("id", requestId)
    .select(COLUMNS)
    .single();
  if (error) return { error };
  logAuditEvent(auditEvent, `request=${requestId}`);
  callFunction("send-appointment-email", { request_id: requestId, kind })
    .catch((e) => console.warn("send-appointment-email failed:", e.message));
  return { data };
}

export function confirmRequest(requestId, proposedAtIso, providerNote) {
  return patchAndNotify(requestId, {
    status: "confirmed",
    proposed_at: proposedAtIso,
    provider_note: providerNote || null,
  }, "confirm", "appointment.confirm");
}

export function counterPropose(requestId, proposedAtIso, providerNote) {
  return patchAndNotify(requestId, {
    status: "counter_proposed",
    proposed_at: proposedAtIso,
    provider_note: providerNote || null,
  }, "counter", "appointment.counter");
}

export function declineRequest(requestId, providerNote) {
  return patchAndNotify(requestId, {
    status: "declined",
    provider_note: providerNote || null,
  }, "decline", "appointment.decline");
}

export function cancelRequest(requestId) {
  return patchAndNotify(requestId, { status: "cancelled" }, "cancel", "appointment.cancel");
}
