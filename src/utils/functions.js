import { supabase, supabaseUrl } from "../supabaseClient";

// Call a Supabase Edge Function with the current user's JWT.
export async function callFunction(name, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON body */ }

  if (!res.ok) {
    const msg = payload?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return payload;
}
