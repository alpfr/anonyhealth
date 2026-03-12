import { T, Icons } from "../constants/theme";
import { MobileNav } from "../components/MobileNav";

// ═══════════════════════════════════════════════════════════
// SCREEN: ABOUT & NAVIGATION (MOBILE)
// ═══════════════════════════════════════════════════════════
export const AboutMobile = ({ theme, onBack }) => {
  const t = T[theme];
  const isDark = theme === "dark";

  const AboutCard = ({ icon, title, desc, color }) => (
    <div style={{
      background: t.bgCard, borderRadius: 16, padding: 16,
      border: `1px solid ${t.border}`, marginBottom: 16,
      boxShadow: t.shadow,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: `${color}15`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif" }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: t.textSec, fontFamily: "'Outfit', sans-serif" }}>
        {desc}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg, animation: "fadeUp 0.3s ease-out" }}>
      <MobileNav theme={theme} onBack={onBack} title="About AnonyHealth" rightAction={null} />

      <div style={{ flex: 1, overflowY: "auto", padding: 20, paddingBottom: 40 }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, background: t.gradient, margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isDark ? `0 0 30px ${t.accent}40` : `0 8px 24px ${t.accent}25`,
          }}>
            {Icons.shield("#fff", 32)}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: t.text, fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.02em" }}>
            AnonyHealth <span style={{ color: t.accent }}>Proto</span>
          </h2>
          <p style={{ fontSize: 14, color: t.textMut, marginTop: 6, fontFamily: "'Outfit', sans-serif" }}>
            Privacy-first AI Triage & Provider Match.
          </p>
        </div>

        <AboutCard
          icon={Icons.bot(t.accent)}
          color={t.accent}
          title="AI Triage Chat"
          desc="Describe your symptoms to our AI assistant powered by Anthropic Claude 3.5. It provides immediate, clinically-relevant guidance and suggests matching specialists."
        />

        <AboutCard
          icon={Icons.search(t.success)}
          color={t.success}
          title="Find Providers"
          desc="Browse our directory of verified healthcare professionals. We prioritize your privacy and do not share your search history with insurance."
        />

        <AboutCard
          icon={Icons.lock(t.danger)}
          color={t.danger}
          title="Confidential Care"
          desc="We verify your identity for legal compliance (Maryland Telehealth), but we operate on a self-pay basis to keep your records private from family/insurance."
        />

        <div style={{ marginTop: 32, padding: 20, background: t.bgNav, borderRadius: 16, border: `1px solid ${t.border}`, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4, fontFamily: "'Outfit', sans-serif" }}>
            How to Navigate
          </div>
          <div style={{ fontSize: 12.5, color: t.textSec, lineHeight: 1.5, fontFamily: "'Outfit', sans-serif" }}>
            Use the <strong>Sidebar (Left)</strong> to switch between Dashboard, Chat, and Settings.
            <br /><br />
            On Mobile, these options are available via the bottom/side menu depending on your screen size.
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 32, opacity: 0.5 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: t.textMut, fontFamily: "'Outfit', sans-serif" }}>
            VERSION 1.0.0 (BETA)
          </div>
          <div style={{ fontSize: 10, color: t.textMut, marginTop: 4, fontFamily: "'Outfit', sans-serif" }}>
            © 2026 OpsSightAI
          </div>
        </div>
      </div>
    </div>
  );
};
