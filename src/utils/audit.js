import { supabase } from "../supabaseClient";

export const logAuditEvent = async (eventType, detail = null) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('audit_logs').insert({
        user_id: session.user.id,
        event_type: eventType,
        detail: detail,
      });
    }
  } catch (err) {
    console.error("Audit log error:", err);
  }
};
