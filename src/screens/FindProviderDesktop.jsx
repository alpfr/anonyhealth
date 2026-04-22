import { useState, useEffect } from "react";
import { T, Icons, Stars } from "../constants/theme";
import { PROVIDERS } from "../data/providers";
import { FilterChip } from "../components/FilterChip";
import { ProviderCard } from "../components/ProviderCard";

// ═══════════════════════════════════════════════════════════
// SCREEN: FIND A PROVIDER (DESKTOP)
// ═══════════════════════════════════════════════════════════
export const FindProviderDesktop = ({ theme, onSelectProvider, providers = PROVIDERS }) => {
  const t = T[theme];
  const [vis, setVis] = useState(false);
  useEffect(() => { setTimeout(() => setVis(true), 80); }, []);

  return (
    <div style={{
      maxWidth: 840, margin: "0 auto", padding: "0 24px",
      opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(16px)",
      transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <h1 style={{
        fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 48,
        fontWeight: 400, color: t.text, textAlign: "center", margin: "0 0 32px",
        letterSpacing: "-0.03em",
      }}>
        Find a provider
      </h1>

      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "14px 20px",
        borderRadius: 14, background: t.bgCard, border: `1px solid ${t.border}`,
        boxShadow: t.shadowMd, marginBottom: 20,
      }}>
        {Icons.search(t.textMut)}
        <input placeholder="Find a provider...." style={{
          border: "none", background: "transparent", outline: "none", flex: 1,
          fontSize: 15, color: t.text, fontFamily: "'Outfit', sans-serif",
        }} />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
        <FilterChip label="Specialty" theme={theme} />
        <FilterChip label="Mode" theme={theme} />
        <FilterChip label="Language" theme={theme} />
        <FilterChip label="Insurance" theme={theme} />
      </div>

      {/* Provider Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {providers.map((prov, i) => (
          <div key={i} style={{
            opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(16px)",
            transition: `all 0.6s ${0.1 + i * 0.08}s cubic-bezier(0.16,1,0.3,1)`,
          }}>
            <ProviderCard prov={prov} theme={theme} onSelect={() => onSelectProvider(i)} />
          </div>
        ))}
      </div>
    </div>
  );
};
