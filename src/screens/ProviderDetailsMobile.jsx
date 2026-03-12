import { T, Icons, Stars } from "../constants/theme";
import { PROVIDERS } from "../data/providers";
import { MobileNav } from "../components/MobileNav";

// ═══════════════════════════════════════════════════════════
// SCREEN: PROVIDER DETAILS (MOBILE)
// ═══════════════════════════════════════════════════════════
export const ProviderDetailsMobile = ({ theme, provider, onBack, onStartAnon, providers = PROVIDERS }) => {
  const t = T[theme];
  const isDark = theme === "dark";
  const prov = providers[provider] || providers[0] || {};

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <h2 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 26, fontWeight: 400, color: t.text, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
          Provider Details
        </h2>

        {/* Profile Card */}
        <div style={{
          padding: 20, borderRadius: 16, background: t.bgCard, border: `1px solid ${t.border}`,
          boxShadow: t.shadow, marginBottom: 16,
        }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, background: t.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif",
              boxShadow: isDark ? `0 0 20px ${t.accent}25` : `0 4px 12px ${t.accent}15`,
            }}>
              {prov.initials}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif" }}>{prov.name}</div>
              <div style={{ fontSize: 13, color: t.textSec, fontFamily: "'Outfit', sans-serif" }}>{prov.specialty}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <Stars rating={prov.rating} color={t.star} />
                <span style={{ fontSize: 11.5, color: t.textMut }}>{prov.distance}</span>
              </div>
            </div>
          </div>
          {prov.telehealth && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px",
              borderRadius: 8, background: t.successBg, border: `1px solid ${t.success}20`,
              fontSize: 12, fontWeight: 600, color: t.success, fontFamily: "'Outfit', sans-serif",
            }}>
              {Icons.video(t.success, 13)} Telehealth only
            </div>
          )}
        </div>

        {/* About */}
        <div style={{
          padding: 20, borderRadius: 16, background: t.bgCard, border: `1px solid ${t.border}`,
          boxShadow: t.shadow, marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", margin: "0 0 10px" }}>About</h3>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: t.textSec, fontFamily: "'Outfit', sans-serif", margin: 0 }}>
            {prov.bio}
          </p>
        </div>

        {/* Expertise */}
        <div style={{
          padding: 20, borderRadius: 16, background: t.bgCard, border: `1px solid ${t.border}`,
          boxShadow: t.shadow, marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", margin: "0 0 12px" }}>Areas of Expertise</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {prov.expertise.map((e, i) => (
              <span key={i} style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                background: t.chipBg, color: t.chipText, fontFamily: "'Outfit', sans-serif",
                border: `1px solid ${t.border}`,
              }}>{e}</span>
            ))}
          </div>
        </div>

        {/* Anonymize */}
        <div style={{
          padding: 16, borderRadius: 14, background: t.accentGlow, border: `1px solid ${t.accent}15`,
          display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
        }}>
          {Icons.eyeOff(t.accent)}
          <span style={{ fontSize: 13, color: t.accent, fontFamily: "'Outfit', sans-serif", fontWeight: 500 }}>
            Anonymize patient activity
          </span>
        </div>

        <button onClick={onStartAnon} style={{
          width: "100%", padding: "15px", borderRadius: 14, border: "none", cursor: "pointer",
          background: t.gradient, color: "#fff", fontSize: 15, fontWeight: 600,
          fontFamily: "'Outfit', sans-serif",
          boxShadow: isDark ? `0 0 24px ${t.accent}30` : `0 4px 16px ${t.accent}20`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {Icons.shield("#fff", 18)} Start Verified Intake
        </button>
      </div>
    </>
  );
};
