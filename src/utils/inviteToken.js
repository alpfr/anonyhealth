/**
 * Extract an invite token from a pasted value. Users may paste:
 *   • A full URL: https://anonyhealth.opssightai.com/invite/abc123xyz
 *   • A path only: /invite/abc123xyz
 *   • Just the token: abc123xyz
 *
 * Returns the token string, or null if no valid token was found.
 *
 * Valid tokens are 16-128 chars of [A-Za-z0-9_-] (matches parseRoute regex).
 */
export function extractInviteToken(input) {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pattern 1: full URL or path with /invite/<token>
  const urlMatch = trimmed.match(/\/invite\/([A-Za-z0-9_-]{16,128})\/?(\?|$|#)/);
  if (urlMatch) return urlMatch[1];

  // Pattern 2: raw token (already meets length + charset requirements)
  if (/^[A-Za-z0-9_-]{16,128}$/.test(trimmed)) return trimmed;

  return null;
}

/**
 * Navigate to the invite acceptance page for a given token.
 * Uses window.location so AcceptInviteMobile can run through its
 * normal flow with the token in the URL.
 */
export function goToInvite(token) {
  if (!token) return;
  window.location.href = `/invite/${encodeURIComponent(token)}`;
}
