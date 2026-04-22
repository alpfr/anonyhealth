import { supabase, supabaseUrl } from "../supabaseClient";

// Audit events are written server-side via the `log-audit` Edge Function.
// The server derives user_id from the JWT and validates event_type; the client
// cannot forge entries for other users or arbitrary event types.
export const logAuditEvent = async (eventType, detail = null) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch(`${supabaseUrl}/functions/v1/log-audit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ event_type: eventType, detail }),
      keepalive: true,
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
};
