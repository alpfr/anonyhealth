import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { T } from "../constants/theme";
import { callFunction } from "../utils/functions";

export const BillingInactiveMobile = ({ theme, subscription, onRefresh }) => {
  const t = T[theme];
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const status = subscription?.status ?? "none";

  const openPortal = async () => {
    setBusy(true);
    setError("");
    try {
      const { url } = await callFunction("stripe-portal", {});
      window.location.href = url;
    } catch (e) {
      setError(e.message || "Unable to open billing portal.");
      setBusy(false);
    }
  };

  const copy = {
    canceled: {
      title: "Subscription canceled",
      body: "Your practice data is retained for 30 days. Reactivate to continue, or export your data before the grace period ends.",
    },
    past_due: {
      title: "Payment past due",
      body: "We couldn't charge your card. Update your payment method to keep access.",
    },
    unpaid: {
      title: "Subscription unpaid",
      body: "Your subscription is paused due to an unpaid invoice. Update billing to restore access.",
    },
    paused: {
      title: "Subscription paused",
      body: "Resume billing to regain access to your patients and logs.",
    },
  }[status] || {
    title: "Subscription inactive",
    body: "Your subscription is not active. Reactivate in the billing portal to continue.",
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 24px", background: t.bg, color: t.text, fontFamily: "'Outfit', sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{copy.title}</h1>
      <p style={{ color: t.textSec, fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>{copy.body}</p>

      {error && <div style={{ marginTop: 12, color: "#dc2626", fontSize: 13 }}>{error}</div>}

      <button
        onClick={openPortal}
        disabled={busy}
        style={{
          marginTop: 24, padding: "14px 16px", borderRadius: 12, border: "none",
          background: t.accent, color: "#fff", fontSize: 15, fontWeight: 600,
          cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? "Opening..." : "Manage billing"}
      </button>

      <button
        onClick={onRefresh}
        style={{
          marginTop: 12, padding: "12px 16px", borderRadius: 12,
          background: "transparent", border: `1px solid ${t.border}`, color: t.text,
          fontSize: 14, cursor: "pointer",
        }}
      >
        I've reactivated — refresh
      </button>

      <button
        onClick={signOut}
        style={{
          marginTop: 24, padding: 8, background: "none", border: "none",
          color: t.textMut, fontSize: 13, cursor: "pointer",
        }}
      >
        Sign out
      </button>
    </div>
  );
};
