// Sentry init. No-op if VITE_SENTRY_DSN is unset, so dev / staging without
// telemetry remain free. We deliberately scrub URLs and disable session
// replay because this is a healthcare app — PHI must never leave the org.

import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN;
const ENV = import.meta.env.VITE_SENTRY_ENV || import.meta.env.MODE || "production";

export function initSentry() {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: ENV,
    // Privacy: never capture request bodies, query strings, headers, cookies,
    // or user IPs. Healthcare app — these may contain PHI.
    sendDefaultPii: false,
    // No automatic breadcrumbs from fetch bodies. Errors only.
    tracesSampleRate: 0,
    // No replay — would record the DOM and could capture rendered PHI.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      // Strip URL query strings (auth tokens can leak there during the
      // password-recovery redirect).
      if (event.request?.url) {
        try { event.request.url = new URL(event.request.url).origin + new URL(event.request.url).pathname; }
        catch { /* leave as-is */ }
      }
      // Drop user.email if Supabase auto-attached it.
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

// Manual capture helper so callers don't import @sentry/react directly.
export function captureException(err, context) {
  if (!DSN) { console.error(err, context); return; }
  Sentry.captureException(err, { extra: context });
}
