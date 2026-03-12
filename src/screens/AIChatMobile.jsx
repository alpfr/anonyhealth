import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { T, Icons } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";

// ═══════════════════════════════════════════════════════════
// SCREEN: AI CHAT (MOBILE)
// ═══════════════════════════════════════════════════════════
const CHAT_MSGS = [
  { role: "bot", text: "Hello! I'm your AI Triage & Medical Assistant. What symptoms are you experiencing?" },
  { role: "user", text: "I've had a sore throat for several days." },
  { role: "bot", text: "Thank you — let me help. Based on your description, you may require medical attention. Would you like to book an appointment with a matching provider?" },
];

export const AIChatMobile = ({ theme, initialMsg, onBack, onBook }) => {
  const t = T[theme];
  const [msgs, setMsgs] = useState(initialMsg ? [{ role: "user", text: initialMsg }] : []);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const chatRef = useRef(null);
  const isDark = theme === "dark";

  useEffect(() => {
    if (initialMsg && msgs.length === 1 && msgs[0].role === "user") {
      // Automatically send initial message
      handleSend(initialMsg, true);
    }
  }, [initialMsg]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs, typing]);

  const handleSend = async (textOverride = null, skipUserAdd = false) => {
    const textToSend = (textOverride || input).trim();
    if (!textToSend) return;

    if (textToSend.length > 2000) {
      setMsgs(prev => [...prev, { role: "bot", text: "Please keep your message under 2000 characters." }]);
      return;
    }

    if (!skipUserAdd) {
      setMsgs(prev => [...prev, { role: "user", text: textToSend }]);
      setInput("");
    }

    setTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('aichat', {
        body: { message: textToSend },
      });

      if (error) throw error;

      const aiResponse = data;
      if (aiResponse && aiResponse.reply) {
        setMsgs(prev => [...prev, { role: "bot", text: aiResponse.reply }]);

        // Log to history if severity is present
        if (aiResponse.severity) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await supabase.from('health_logs').insert({
              user_id: session.user.id,
              symptom: aiResponse.symptom || "Triage Session",
              severity: aiResponse.severity,
              ai_advice: aiResponse.reply
            });
          }
        }
      } else {
        throw new Error("No reply in data");
      }
    } catch (err) {
      console.error("AI Error:", err);
      // Fallback message if AI fails (or no API key set)
      setMsgs(prev => [...prev, { role: "bot", text: "I'm having trouble connecting to the AI service. Please try again in a moment." }]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} rightAction={
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {Icons.lock(t.success, 13)}
          <span style={{ fontSize: 11, fontWeight: 600, color: t.success, fontFamily: "'Outfit', sans-serif" }}>Encrypted</span>
        </div>
      } />
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* AI header */}
        <div style={{
          textAlign: "center", padding: "12px 0 16px", borderBottom: `1px solid ${t.border}`, marginBottom: 8,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, background: t.gradient, margin: "0 auto 8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isDark ? `0 0 24px ${t.accent}25` : `0 4px 12px ${t.accent}15`,
          }}>
            {Icons.bot("#fff")}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif" }}>AI Triage Assistant</div>
          <div style={{ fontSize: 11.5, color: t.textMut, fontFamily: "'Outfit', sans-serif", marginTop: 2 }}>Confidential session • No insurance shared</div>
        </div>

        {msgs.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: t.textMut, fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>
            How can I help you today?
          </div>
        )}

        {msgs.map((msg, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            animation: "chatIn 0.35s ease-out",
          }}>
            <div style={{
              maxWidth: "82%", padding: "11px 15px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user" ? t.accent : t.bgCard,
              color: msg.role === "user" ? "#fff" : t.text,
              fontSize: 14, lineHeight: 1.55, fontFamily: "'Outfit', sans-serif",
              border: msg.role === "user" ? "none" : `1px solid ${t.border}`,
              boxShadow: msg.role === "user" ? (isDark ? `0 2px 12px ${t.accent}30` : `0 2px 8px ${t.accent}15`) : "none",
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: "flex" }}>
            <div style={{
              padding: "12px 18px", borderRadius: "16px 16px 16px 4px",
              background: t.bgCard, border: `1px solid ${t.border}`,
              display: "flex", gap: 5,
            }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{
                  width: 7, height: 7, borderRadius: "50%", background: t.textMut,
                  animation: `dotPulse 1.4s ${j * 0.2}s infinite ease-in-out`,
                }} />
              ))}
            </div>
          </div>
        )}

        {msgs.length >= 2 && msgs[msgs.length - 1].role === "bot" && (
          <div style={{ animation: "chatIn 0.4s ease-out", marginTop: 4 }}>
            <button onClick={onBook} style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer",
              background: t.gradient, color: "#fff", fontSize: 14, fontWeight: 700,
              fontFamily: "'Outfit', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: isDark ? `0 0 20px ${t.accent}30` : `0 4px 16px ${t.accent}20`,
            }}>
              BOOK APPOINTMENT {Icons.arrowRight("#fff", 16)}
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${t.border}`, background: t.bgNav, flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
          borderRadius: 12, background: t.bgInput, border: `1px solid ${t.border}`,
        }}>
          <input
            placeholder="Type your symptoms..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            style={{
              flex: 1, border: "none", background: "transparent", outline: "none",
              fontSize: 14, color: t.text, fontFamily: "'Outfit', sans-serif",
            }}
          />
          <button onClick={() => handleSend()} disabled={!input.trim() || typing} style={{
            width: 34, height: 34, borderRadius: 10, border: "none", cursor: "pointer",
            background: input.trim() ? t.gradient : t.textMut,
            opacity: input.trim() ? 1 : 0.5,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {Icons.send("#fff", 14)}
          </button>
        </div>
      </div>
    </>
  );
};
