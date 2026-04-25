import { useCallback, useEffect, useRef, useState } from "react";
import { T, Icons } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";
import { useAuth } from "../context/AuthContext";
import { useTenant } from "../context/TenantContext";
import {
  listMessages,
  markConversationRead,
  sendMessage,
  subscribeToConversation,
} from "../services/messages";
import { logAuditEvent } from "../utils/audit";

// ═══════════════════════════════════════════════════════════
// SCREEN: MESSAGES (MOBILE)
// Shared by patient and doctor views. The conversation is identified by
// (tenantId, patientUserId). Patient view passes their own user id;
// doctor view passes the patient's user id.
// ═══════════════════════════════════════════════════════════
export const MessagesMobile = ({ theme, patientUserId, headerLabel = "Messages", onBack }) => {
  const t = T[theme];
  const { session } = useAuth();
  const { tenant } = useTenant();
  const myId = session?.user?.id ?? null;
  const conversationPatientId = patientUserId ?? myId;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const tenantId = tenant?.id;
  const ready = tenantId && conversationPatientId && myId;

  const refresh = useCallback(async () => {
    if (!ready) return;
    try {
      const data = await listMessages(tenantId, conversationPatientId);
      setMessages(data);
      setError("");
    } catch (e) {
      setError(e.message || "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, conversationPatientId, ready]);

  useEffect(() => { if (ready) refresh(); }, [ready, refresh]);

  // Mark recipient-side messages read on entry.
  useEffect(() => {
    if (!ready) return;
    markConversationRead(tenantId, conversationPatientId, myId).then(() => {
      logAuditEvent("message.read", `conversation=${conversationPatientId}`);
    });
  }, [ready, tenantId, conversationPatientId, myId]);

  // Realtime subscription.
  useEffect(() => {
    if (!ready) return;
    const channel = subscribeToConversation(tenantId, conversationPatientId, (row) => {
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    });
    return () => { channel.unsubscribe(); };
  }, [ready, tenantId, conversationPatientId]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    if (!ready) return;
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError("");
    const { error: sendErr } = await sendMessage(tenantId, conversationPatientId, myId, body);
    setSending(false);
    if (sendErr) {
      setError(sendErr.message || "Failed to send.");
      return;
    }
    setDraft("");
    logAuditEvent("message.send", `conversation=${conversationPatientId}`);
    refresh();
  };

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: t.bg }}>
        <div style={{ padding: "12px 20px 8px", borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.06em" }}>Conversation</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", marginTop: 2 }}>
            {headerLabel}
          </div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {loading && <div style={{ fontSize: 13, color: t.textMut }}>Loading...</div>}
          {!loading && messages.length === 0 && (
            <div style={{ fontSize: 13, color: t.textSec, textAlign: "center", padding: 24 }}>
              No messages yet. Say hello.
            </div>
          )}
          {messages.map((m) => {
            const mine = m.sender_user_id === myId;
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: mine ? t.accent : t.bgCard,
                  color: mine ? "#fff" : t.text,
                  border: mine ? "none" : `1px solid ${t.border}`,
                  fontSize: 14, lineHeight: 1.4, fontFamily: "'Outfit', sans-serif",
                }}>
                  {m.body}
                  <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ padding: "8px 16px", color: "#dc2626", fontSize: 12 }}>{error}</div>
        )}

        <div style={{ padding: 12, borderTop: `1px solid ${t.border}`, background: t.bgNav, display: "flex", gap: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message..."
            disabled={sending}
            maxLength={4000}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 999,
              border: `1px solid ${t.border}`, background: t.bgCard, color: t.text,
              fontSize: 14, outline: "none", fontFamily: "'Outfit', sans-serif",
            }}
          />
          <button onClick={send} disabled={sending || !draft.trim()} style={{
            padding: "10px 16px", borderRadius: 999, border: "none",
            background: t.accent, color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: sending || !draft.trim() ? "not-allowed" : "pointer",
            opacity: sending || !draft.trim() ? 0.5 : 1,
          }}>
            {Icons.send ? Icons.send("#fff", 14) : "Send"}
          </button>
        </div>
      </div>
    </>
  );
};
