import { T, Icons } from "../constants/theme";
import { MobileNav } from "./MobileNav";

/**
 * UpgradePrompt — shown when an anonymous user navigates to a feature that
 * requires a real account (messaging, booking).
 *
 * Frames the upgrade as a value exchange, not a wall. The visitor's existing
 * anonymous session and chat history carry over once they sign up.
 */
export const UpgradePrompt = ({ theme = "light", feature, onUpgrade, onBack }) => {
  const t = T[theme] || T.light;
  const isDark = theme === "dark";

  return (
    <>
      <MobileNav theme={theme} title="" onBack={onBack} />
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            paddingTop: 24,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: t.gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              boxShadow: isDark
                ? `0 0 32px ${t.accent}25`
                : `0 8px 24px ${t.accent}15`,
            }}
          >
            {Icons.lock("#fff", 28)}
          </div>

          <h1
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 28,
              fontWeight: 400,
              color: t.text,
              margin: "0 0 10px",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            Save your session to {feature}
          </h1>

          <p
            style={{
              fontSize: 14,
              color: t.textSec,
              fontFamily: "'Outfit', sans-serif",
              margin: 0,
              lineHeight: 1.6,
              maxWidth: 320,
            }}
          >
            Your triage history will carry over. We never share your data with
            anyone — your account just lets you continue across sessions.
          </p>
        </div>

        {/* What you get */}
        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadow,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: t.textMut,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            With an account
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {[
              "Save triage history across devices",
              "Message providers directly",
              "Book and manage appointments",
              "Receive secure appointment reminders",
            ].map((item, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 14,
                  color: t.text,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: t.successBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {Icons.shield(t.success, 11)}
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Privacy reassurance */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: t.accentGlow,
            border: `1px solid ${t.accent}15`,
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
          }}
        >
          {Icons.lock(t.accent, 16)}
          <span
            style={{
              fontSize: 12.5,
              color: t.text,
              fontFamily: "'Outfit', sans-serif",
              lineHeight: 1.5,
            }}
          >
            Your existing anonymous session links to the new account — no need
            to start over.
          </span>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onUpgrade}
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 14,
            border: "none",
            cursor: "pointer",
            background: t.gradient,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "'Outfit', sans-serif",
            boxShadow: isDark
              ? `0 0 24px ${t.accent}30`
              : `0 4px 16px ${t.accent}20`,
          }}
        >
          Save my session
        </button>

        <button
          type="button"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: t.textSec,
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "'Outfit', sans-serif",
            padding: 0,
          }}
        >
          Keep browsing anonymously
        </button>
      </div>
    </>
  );
};
