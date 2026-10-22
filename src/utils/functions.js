import { supabase, supabaseUrl } from "../supabaseClient";

// Call a Supabase Edge Function with the current user's JWT.
//
// Anonymous sessions have a valid access_token just like authenticated ones,
// but if AuthContext hasn't finished the bootstrap yet when this is called
// (e.g. a provider enters their practice name immediately on load), the initial
// getSession() call may transiently return null. We attempt one refreshSession()
// before giving up so the "Not authenticated" error doesn't surface on race
// conditions during the anonymous-to-authenticated bootstrap window.
export async function callFunction(name, body) {
  let { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    // Attempt a single refresh to recover from a transient null-session state
    // (common during the anonymous bootstrap settling period on first load).
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed?.session ?? null;
  }

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

