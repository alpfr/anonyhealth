import { T, Icons } from "../constants/theme";
import { PROVIDERS } from "../data/providers";
import { MobileNav } from "../components/MobileNav";
import { FilterChip } from "../components/FilterChip";
import { ProviderCard } from "../components/ProviderCard";

// ═══════════════════════════════════════════════════════════
// SCREEN: FIND PROVIDER (MOBILE)
// ═══════════════════════════════════════════════════════════
export const FindProviderMobile = ({ theme, onSelectProvider, providers = PROVIDERS }) => {
  const t = T[theme];

  return (
    <>
      <MobileNav theme={theme} />
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 20px" }}>
        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28,
          fontWeight: 400, color: t.text, margin: "0 0 16px", letterSpacing: "-0.02em",
        }}>
          Find a provider
        </h1>

        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
          borderRadius: 12, background: t.bgCard, border: `1px solid ${t.border}`,
          marginBottom: 12, boxShadow: t.shadow,
        }}>
          {Icons.search(t.textMut, 16)}
          <span style={{ fontSize: 14, color: t.textMut, fontFamily: "'Outfit', sans-serif" }}>Find a provider...</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18, overflowX: "auto", paddingBottom: 4 }}>
          <FilterChip label="Specialty" theme={theme} />
          <FilterChip label="Mode" theme={theme} />
          <FilterChip label="Language" theme={theme} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {providers.map((prov, i) => (
            <ProviderCard key={i} prov={prov} theme={theme} onSelect={() => onSelectProvider(i)} compact />
          ))}
        </div>
      </div>
    </>
  );
};
