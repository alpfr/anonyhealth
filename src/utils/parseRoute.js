/**
 * parseRoute — derive the current route from window.location.pathname.
 *
 * Returns a plain object describing the route kind and any associated data.
 * This is used in place of a routing library; the app uses a state-machine
 * model for navigation within each shell (DoctorApp / PatientApp).
 */
export function parseRoute() {
  const path = window.location.pathname;

  const inviteMatch = path.match(/^\/invite\/([A-Za-z0-9_-]{16,128})\/?$/);
  if (inviteMatch) return { kind: "invite", token: inviteMatch[1] };

  if (path.startsWith("/billing/success")) return { kind: "billing_success" };
  if (path.startsWith("/billing/cancel")) return { kind: "billing_cancel" };

  if (path === "/terms") return { kind: "legal", page: "terms" };
  if (path === "/privacy") return { kind: "legal", page: "privacy" };
  if (path === "/hipaa") return { kind: "legal", page: "hipaa" };

  if (path === "/signup") return { kind: "auth", mode: "signup" };
  if (path === "/signin") return { kind: "auth", mode: "signin" };

  if (path === "/reset-password") return { kind: "reset_password" };

  return { kind: "app" };
}
