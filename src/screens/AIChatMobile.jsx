import { useState, useEffect, useRef, useCallback, memo } from "react";
import { supabase } from "../supabaseClient";
import { T, Icons } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";
import { sanitizeChatMessage } from "../utils/validation";
import { insertHealthLog } from "../services/healthLogs";
import { useTenant } from "../context/TenantContext";
import { useAuth } from "../context/AuthContext";
import { getProviderProfile } from "../services/providerProfile";
import { evaluateEmergencyReflex, sanitizeClientPII } from "../utils/jevReflex";
import { EmergencyInterceptModal } from "../components/EmergencyInterceptModal";

const ensureHttps = (u) => (u && /^https?:\/\//i.test(u) ? u : u ? `https://${u}` : null);

// ═══════════════════════════════════════════════════════════
// Multi-agent AI Chat
//
// Conversation flow:
//   1. User → Intake Agent (multi-turn). Intake gathers symptoms,
//      asks one focused question per turn.
//   2. When Intake says "<complete/>", the frontend silently calls the
//      Triage Agent with the full conversation history.
//   3. Triage produces a final assessment with structured metadata that
//      gets logged to health_logs.
//
// Each AI message is labeled with the agent that produced it ("Intake" or
// "Triage") so the multi-agent architecture is visible to the user.
// ═══════════════════════════════════════════════════════════

const COMPLETE_MARKER = /<complete\s*\/?>/i;

/**
 * Stream a Server-Sent Events response from a Supabase function. Returns
 * the full assembled text. The `onDelta` callback is invoked with each
 * new chunk so the UI can render incrementally.
 */
async function streamSseResponse(response, onDelta) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep the last (potentially incomplete) line in the buffer.
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ") || line.trim() === "data: [DONE]") continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === "content_block_delta" && data.delta?.text) {
          fullText += data.delta.text;
          onDelta(fullText);
        }
      } catch {
        // Malformed SSE chunk — skip.
      }
    }
  }

  // Process any remaining buffered content.
  if (buffer.startsWith("data: ") && buffer.trim() !== "data: [DONE]") {
    try {
      const data = JSON.parse(buffer.slice(6));
      if (data.type === "content_block_delta" && data.delta?.text) {
        fullText += data.delta.text;
        onDelta(fullText);
      }
    } catch {
      // Incomplete final chunk — skip.
    }
  }

  return fullText;
}

/**
 * Strip control markers (<complete/>, <metadata>...</metadata>) from text
 * before it's shown to the user. Returns the cleaned text for display.
 */
function cleanForDisplay(text) {
  let cleaned = text.replace(COMPLETE_MARKER, "").trim();
  if (cleaned.includes("<metadata>")) {
    cleaned = cleaned.split("<metadata>")[0].trim();
  }
  return cleaned;
}

/**
 * Memoized chat bubble — prevents re-rendering of already-complete messages
 * while new content streams into the latest bot message.
 */
const ChatBubble = memo(function ChatBubble({ msg, showAgentLabel, t, isDark, agentLabel, agentColor }) {
  const isBot = msg.role === "bot";
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: isBot ? "flex-start" : "flex-end",
      animation: "chatIn 0.35s ease-out",
    }}>
      {showAgentLabel && (
        <div style={{
          fontSize: 11, fontWeight: 600, color: agentColor,
          fontFamily: "'Outfit', sans-serif", marginBottom: 4,
          paddingLeft: 4, display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: agentColor, display: "inline-block",
          }} />
          {agentLabel}
        </div>
      )}
      <div style={{
        maxWidth: "82%", padding: "11px 15px",
        borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: msg.isEmergency
          ? (isDark ? "rgba(239, 68, 68, 0.15)" : "#FEF2F2")
          : (msg.role === "user" ? t.accent : t.bgCard),
        color: msg.isEmergency
          ? (isDark ? "#FECACA" : "#991B1B")
          : (msg.role === "user" ? "#fff" : t.text),
        fontSize: 14, lineHeight: 1.55, fontFamily: "'Outfit', sans-serif",
        border: msg.isEmergency
          ? `2px solid ${t.danger}`
          : (msg.role === "user" ? "none" : `1px solid ${t.border}`),
        boxShadow: msg.role === "user"
          ? (isDark ? `0 2px 12px ${t.accent}30` : `0 2px 8px ${t.accent}15`)
          : (msg.isEmergency ? "0 4px 16px rgba(220, 38, 38, 0.2)" : "none"),
        whiteSpace: "pre-wrap",
      }}>
        {msg.text}

        {msg.isEmergency && (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href="tel:911" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", background: "#DC2626", color: "#fff",
              borderRadius: 10, fontSize: 12.5, fontWeight: 700,
              textDecoration: "none", boxShadow: "0 2px 8px rgba(220, 38, 38, 0.3)",
            }}>
              <span>📞</span> Call 911 Now
            </a>
            <a href="tel:988" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", background: isDark ? "#2A3352" : "#F3F4F6",
              color: t.text, borderRadius: 10, fontSize: 12.5, fontWeight: 600,
              textDecoration: "none", border: `1px solid ${t.border}`,
            }}>
              <span>💬</span> Dial 988
            </a>
          </div>
        )}
      </div>
    </div>
  );
});

export const AIChatMobile = ({ theme, initialMsg, onBack }) => {
  const t = T[theme];
  const isDark = theme === "dark";
  const { tenant } = useTenant();
  const { isAnonymous } = useAuth();
  const [bookingUrl, setBookingUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!tenant?.id) return;
    getProviderProfile(tenant.id)
      .then((p) => {
        if (!cancelled) setBookingUrl(ensureHttps(p?.scheduling_url));
      })
      .catch(() => {/* non-fatal */});
    return () => { cancelled = true; };
  }, [tenant?.id]);

  // Each message has: { id, role: "user" | "bot", text, agent?: "intake" | "triage" }
  const nextId = () => ++msgIdRef.current;
  const [msgs, setMsgs] = useState(
    initialMsg ? [{ id: 0, role: "user", text: initialMsg }] : []
  );
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  // Tracks which agent is producing the next bot response (for the typing label).
  const [currentAgent, setCurrentAgent] = useState("intake");
  // Once the triage assessment has been delivered we lock further user input.
  const [triageDone, setTriageDone] = useState(false);
  // Jev System 1 Emergency Reflex Intercept State
  const [emergencyData, setEmergencyData] = useState(null);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const chatRef = useRef(null);
  const abortRef = useRef(null);
  const msgIdRef = useRef(0); // Stable key counter for chat messages
  const lastSentRef = useRef(0); // Rate-limit: timestamp of last send

  useEffect(() => {
    if (initialMsg && msgs.length === 1 && msgs[0].role === "user") {
      handleSend(initialMsg, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMsg]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs, typing]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  /**
   * Call /triage with the full conversation history. Streams the response
   * into a new bot message, then parses the final metadata for logging.
   */
  const callTriageAgent = useCallback(async (historyForTriage, session) => {
    setCurrentAgent("triage");
    setTyping(true);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/triage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ history: historyForTriage }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(
          res.status === 429
            ? "Triage is rate-limited. Please wait a minute."
            : "Triage service unavailable."
        );
      }

      setTyping(false);
      // Push an empty triage message that we'll fill via streaming.
      setMsgs((prev) => [...prev, { id: nextId(), role: "bot", text: "", agent: "triage" }]);

      const fullText = await streamSseResponse(res, (assembled) => {
        const display = cleanForDisplay(assembled);
        setMsgs((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], text: display };
          return next;
        });
      });

      // Parse the metadata tag and log to health history.
      if (fullText.includes("<metadata>") && session?.user && tenant?.id) {
        try {
          const metaStr = fullText
            .split("<metadata>")[1]
            ?.replace("</metadata>", "")
            ?.trim();
          const meta = JSON.parse(metaStr);
          if (meta.severity) {
            await insertHealthLog(session.user.id, tenant.id, {
              symptom: meta.symptom,
              severity: meta.severity,
              ai_advice: cleanForDisplay(fullText),
              // Future: persist urgency + next_steps once the column exists.
            });
          }
        } catch (parseErr) {
          console.error("Triage metadata parse error", parseErr);
        }
      }
      setTriageDone(true);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Triage error:", err);
      setTyping(false);
      setMsgs((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "bot",
          agent: "triage",
          text: err.message || "Couldn't run triage assessment. Please try again.",
        },
      ]);
    }
  }, [tenant?.id]);

  const handleSend = useCallback(async (textOverride = null, skipUserAdd = false) => {
    if (triageDone) return; // Conversation has ended.

    // Rate-limit: ignore rapid-fire sends (2s cooldown)
    const now = Date.now();
    if (!skipUserAdd && now - lastSentRef.current < 2000) return;
    lastSentRef.current = now;

    const raw = textOverride || input;
    const textToSend = sanitizeChatMessage(raw);
    if (!textToSend) return;

    // ─── Jev System 1 Deterministic Edge Reflex Check (<1ms, $0.00 Token Cost) ───
    const emergencyIntercept = evaluateEmergencyReflex(textToSend);
    if (emergencyIntercept) {
      setEmergencyData(emergencyIntercept);
      setShowEmergencyModal(true);
      if (!skipUserAdd) {
        setMsgs((prev) => [
          ...prev,
          { id: nextId(), role: "user", text: textToSend },
          {
            id: nextId(),
            role: "bot",
            agent: "triage",
            isEmergency: true,
            text: emergencyIntercept.advice,
          },
        ]);
        setInput("");
      } else {
        setMsgs((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "bot",
            agent: "triage",
            isEmergency: true,
            text: emergencyIntercept.advice,
          },
        ]);
      }
      setTriageDone(true);
      return;
    }

    // ─── Zero-Knowledge PII Sanitization ───
    const { sanitized: piiCleanedText } = sanitizeClientPII(textToSend);

    if (piiCleanedText.length > 2000) {
      setMsgs((prev) => [
        ...prev,
        { id: nextId(), role: "bot", agent: "intake", text: "Please keep your message under 2000 characters." },
      ]);
      return;
    }

    // Build the message list as it'll appear AFTER this user turn is added,
    // because both UI state and Intake API need to see this turn.
    const newUserMsg = { id: nextId(), role: "user", text: piiCleanedText };
    const baseMsgs = skipUserAdd ? msgs : [...msgs, newUserMsg];

    if (!skipUserAdd) {
      setMsgs((prev) => [...prev, newUserMsg]);
      setInput("");
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setCurrentAgent("intake");
    setTyping(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Please sign in to use AI chat.");
      }

      // Convert UI msgs (excluding the brand-new user turn) into the API's
      // expected role/content format for the Intake endpoint.
      const history = baseMsgs
        .slice(0, -1) // exclude the message we're about to send
        .map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text,
        }))
        .filter((m) => m.content && m.content.length > 0);

      const res = await fetch(`${supabaseUrl}/functions/v1/intake`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ message: piiCleanedText, history }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const status = res.status;
        if (status === 401) throw new Error("Your session has expired. Please sign in again.");
        if (status === 429) throw new Error("Too many requests. Please wait a moment.");
        if (status >= 500) throw new Error("AI service is temporarily unavailable.");
        throw new Error("Failed to connect to AI service.");
      }

      setTyping(false);
      const botMsgId = nextId();
      setMsgs((prev) => [...prev, { id: botMsgId, role: "bot", text: "", agent: "intake" }]);

      const fullText = await streamSseResponse(res, (assembled) => {
        const display = cleanForDisplay(assembled);
        setMsgs((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], text: display };
          return next;
        });
      });

      // Did Intake signal it's done? If so, kick off triage with the full
      // transcript (including this just-completed intake turn).
      if (COMPLETE_MARKER.test(fullText)) {
        // Use the latest msgs state when building the transcript for triage.
        const transcript = [
          ...baseMsgs.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          })),
          {
            role: "assistant",
            content: fullText.replace(COMPLETE_MARKER, "").trim(),
          },
        ];
        await callTriageAgent(transcript, session);
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Intake error:", err);
      setMsgs((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "bot",
          agent: "intake",
          text: err.message || "I'm having trouble connecting. Please try again in a moment.",
        },
      ]);
      setTyping(false);
    }
  }, [input, msgs, triageDone, callTriageAgent]);

  // ─── UI helpers ────────────────────────────────────────
  const agentLabel = (agent) =>
    agent === "triage" ? "Triage Agent" : "Intake Agent";

  const agentColor = (agent) =>
    agent === "triage" ? t.warn : t.accent;

  return (
    <>
      <MobileNav
        theme={theme}
        onBack={onBack}
        rightAction={
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {Icons.lock(t.success, 13)}
            <span style={{ fontSize: 11, fontWeight: 600, color: t.success, fontFamily: "'Outfit', sans-serif" }}>
              Encrypted
            </span>
          </div>
        }
      />
      <div ref={chatRef} aria-live="polite" aria-label="Chat messages" style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* AI header */}
        <div style={{ textAlign: "center", padding: "12px 0 16px", borderBottom: `1px solid ${t.border}`, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, background: t.gradient, margin: "0 auto 8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isDark ? `0 0 24px ${t.accent}25` : `0 4px 12px ${t.accent}15`,
          }}>
            {Icons.bot("#fff")}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif" }}>
            AI Triage Assistant
          </div>
          <div style={{ fontSize: 11.5, color: t.textMut, fontFamily: "'Outfit', sans-serif", marginTop: 2 }}>
            Multi-agent · Confidential
          </div>
        </div>

        {msgs.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: t.textMut, fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>
            How can I help you today?
          </div>
        )}

        {msgs.map((msg, i) => {
          const isBot = msg.role === "bot";
          const prevAgent =
            i > 0 && msgs[i - 1].role === "bot" ? msgs[i - 1].agent : null;
          const showLabel = isBot && msg.agent && msg.agent !== prevAgent;

          return (
            <ChatBubble
              key={msg.id}
              msg={msg}
              showAgentLabel={showLabel}
              t={t}
              isDark={isDark}
              agentLabel={agentLabel(msg.agent)}
              agentColor={agentColor(msg.agent)}
            />
          );
        })}

        {typing && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: agentColor(currentAgent),
              fontFamily: "'Outfit', sans-serif",
              marginBottom: 4,
              paddingLeft: 4,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: agentColor(currentAgent),
                display: "inline-block",
                animation: "dotPulse 1.4s infinite ease-in-out",
              }} />
              {agentLabel(currentAgent)} is typing…
            </div>
            <div style={{
              padding: "12px 18px",
              borderRadius: "16px 16px 16px 4px",
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              display: "flex", gap: 5,
            }}>
              {[0, 1, 2].map((j) => (
                <div key={j} style={{
                  width: 7, height: 7, borderRadius: "50%", background: t.textMut,
                  animation: `dotPulse 1.4s ${j * 0.2}s infinite ease-in-out`,
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Post-triage CTA — three flavors based on identity tier:
              • Anonymous → "Save your session" upgrade prompt (booking gated)
              • Patient with provider & bookingUrl → external booking link
              • Patient without bookingUrl → in-app Book Appointment screen
            All three only render after the Triage Agent has finished. */}
        {triageDone && isAnonymous && (
          <div style={{ animation: "chatIn 0.4s ease-out", marginTop: 12 }}>
            <button
              type="button"
              onClick={() => { window.location.href = "/signup"; }}
              style={{
                width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer",
                background: t.gradient, color: "#fff", fontSize: 14, fontWeight: 700,
                fontFamily: "'Outfit', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: isDark ? `0 0 20px ${t.accent}30` : `0 4px 16px ${t.accent}20`,
                boxSizing: "border-box",
              }}
            >
              SAVE SESSION TO BOOK APPOINTMENT {Icons.arrowRight("#fff", 16)}
            </button>
            <div style={{
              fontSize: 11.5, color: t.textMut, marginTop: 8, textAlign: "center",
              fontFamily: "'Outfit', sans-serif",
            }}>
              Your assessment will carry over to your account.
            </div>
          </div>
        )}

        {triageDone && !isAnonymous && bookingUrl && (
          <div style={{ animation: "chatIn 0.4s ease-out", marginTop: 12 }}>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer",
                background: t.gradient, color: "#fff", fontSize: 14, fontWeight: 700,
                fontFamily: "'Outfit', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: isDark ? `0 0 20px ${t.accent}30` : `0 4px 16px ${t.accent}20`,
                textDecoration: "none", boxSizing: "border-box",
              }}
            >
              BOOK APPOINTMENT {Icons.arrowRight("#fff", 16)}
            </a>
          </div>
        )}

        {triageDone && !isAnonymous && !bookingUrl && (
          <div style={{
            animation: "chatIn 0.4s ease-out", marginTop: 12,
            padding: "12px 14px", borderRadius: 12, background: t.bgCard,
            border: `1px solid ${t.border}`,
            fontSize: 12.5, color: t.textSec, textAlign: "center",
            fontFamily: "'Outfit', sans-serif",
          }}>
            Your provider hasn't enabled online booking yet. Contact them through Messages.
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}`, background: t.bgNav, flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
          borderRadius: 12, background: t.bgInput, border: `1px solid ${t.border}`,
          opacity: triageDone ? 0.5 : 1,
        }}>
          <input
            placeholder={triageDone ? "Assessment complete" : "Type your symptoms..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={triageDone}
            style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              fontSize: 14, color: t.text, fontFamily: "'Outfit', sans-serif",
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || typing || triageDone}
            style={{
              width: 34, height: 34, borderRadius: 10, border: "none",
              cursor: input.trim() && !triageDone ? "pointer" : "default",
              background: input.trim() && !triageDone ? t.gradient : t.textMut,
              opacity: input.trim() && !triageDone ? 1 : 0.5,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {Icons.send("#fff", 14)}
          </button>
        </div>
      </div>

      {/* Jev System 1 Emergency Reflex Intercept Modal */}
      <EmergencyInterceptModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        interceptData={emergencyData}
        theme={theme}
      />
    </>
  );
};
