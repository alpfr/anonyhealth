import { supabase } from "../supabaseClient";

/**
 * List messages in a conversation, oldest-first for chat display.
 * @param {string} tenantId
 * @param {string} patientUserId
 * @param {number} limit
 */
export async function listMessages(tenantId, patientUserId, limit = 200) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, tenant_id, patient_user_id, sender_user_id, body, created_at, read_at")
    .eq("tenant_id", tenantId)
    .eq("patient_user_id", patientUserId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/**
 * Send a message into a conversation. The caller must be either the
 * patient (sending into their own thread) or a doctor of the tenant.
 */
export async function sendMessage(tenantId, patientUserId, senderUserId, body) {
  const trimmed = (body || "").trim();
  if (!trimmed) return { error: "Message body is required" };
  if (trimmed.length > 4000) return { error: "Message exceeds 4000 characters" };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      tenant_id: tenantId,
      patient_user_id: patientUserId,
      sender_user_id: senderUserId,
      body: trimmed,
    })
    .select()
    .single();
  return { data, error };
}

/**
 * Mark unread messages addressed to me as read. The "addressed to me" rule
 * is: any row where I am NOT the sender within my conversation.
 */
export async function markConversationRead(tenantId, patientUserId, myUserId) {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("patient_user_id", patientUserId)
    .neq("sender_user_id", myUserId)
    .is("read_at", null);
  return { error };
}

/**
 * Subscribe to new messages in a conversation. Returns the subscription
 * channel; call .unsubscribe() to clean up.
 */
export function subscribeToConversation(tenantId, patientUserId, onInsert) {
  const channel = supabase
    .channel(`messages:${tenantId}:${patientUserId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `patient_user_id=eq.${patientUserId}`,
      },
      (payload) => {
        if (payload.new?.tenant_id === tenantId) onInsert(payload.new);
      },
    )
    .subscribe();
  return channel;
}
