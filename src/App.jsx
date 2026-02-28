import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

// ═══════════════════════════════════════════════════════════
// AUDIT LOGGING (SOC 2)
// ═══════════════════════════════════════════════════════════
const logAuditEvent = async (eventType, detail = null) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('audit_logs').insert({
        user_id: session.user.id,
        event_type: eventType,
        detail: detail,
      });
    }
  } catch (err) {
    console.error("Audit log error:", err);
  }
};

// ═══════════════════════════════════════════════════════════
// THEME SYSTEM
// ═══════════════════════════════════════════════════════════
const T = {
  light: {
    bg: "#F6F7FB", bgCard: "#FFFFFF", bgInput: "#F0F2F6", bgHover: "#F5F7FA",
    bgNav: "rgba(255,255,255,0.92)", bgSheet: "#FFFFFF",
    text: "#111827", textSec: "#5B6378", textMut: "#9CA3B4",
    accent: "#2563EB", accentDark: "#1D4ED8", accentLight: "#EEF2FF",
    accentGlow: "rgba(37,99,235,0.10)", accentSoft: "#DBEAFE",
    success: "#059669", successBg: "#ECFDF5", successLight: "#D1FAE5",
    warn: "#D97706", warnBg: "#FFFBEB", warnLight: "#FEF3C7",
    danger: "#DC2626", dangerBg: "#FEF2F2",
    border: "#E5E7EB", borderLight: "#F3F4F6",
    shadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
    shadowMd: "0 4px 16px rgba(0,0,0,0.06)",
    shadowLg: "0 12px 40px rgba(0,0,0,0.08)",
    gradient: "linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)",
    star: "#F59E0B",
    urgentBg: "#FEF3C7", urgentText: "#92400E", urgentBorder: "#FCD34D",
    chipBg: "#F3F4F6", chipText: "#374151",
    toggleBg: "#E5E7EB", toggleActive: "#2563EB",
  },
  dark: {
    bg: "#0B0F1A", bgCard: "#131829", bgInput: "#1A2038", bgHover: "#1E2545",
    bgNav: "rgba(11,15,26,0.92)", bgSheet: "#131829",
    text: "#E8ECF4", textSec: "#8892A8", textMut: "#4B5572",
    accent: "#38BDF8", accentDark: "#0EA5E9", accentLight: "rgba(56,189,248,0.08)",
    accentGlow: "rgba(56,189,248,0.12)", accentSoft: "rgba(56,189,248,0.15)",
    success: "#34D399", successBg: "rgba(52,211,153,0.08)", successLight: "rgba(52,211,153,0.15)",
    warn: "#FBBF24", warnBg: "rgba(251,191,36,0.08)", warnLight: "rgba(251,191,36,0.15)",
    danger: "#F87171", dangerBg: "rgba(248,113,113,0.08)",
    border: "#1E293B", borderLight: "#1A2038",
    shadow: "0 1px 3px rgba(0,0,0,0.3)",
    shadowMd: "0 4px 16px rgba(0,0,0,0.4)",
    shadowLg: "0 12px 40px rgba(0,0,0,0.5)",
    gradient: "linear-gradient(135deg, #38BDF8 0%, #818CF8 50%, #C084FC 100%)",
    star: "#FBBF24",
    urgentBg: "rgba(251,191,36,0.10)", urgentText: "#FBBF24", urgentBorder: "rgba(251,191,36,0.3)",
    chipBg: "#1A2038", chipText: "#CBD5E1",
    toggleBg: "#1E293B", toggleActive: "#38BDF8",
  },
};

// ═══════════════════════════════════════════════════════════
// SVG ICONS
// ═══════════════════════════════════════════════════════════
const Icons = {
  shield: (c, s = 20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>,
  search: (c, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  chevDown: (c, s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>,
  chevRight: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>,
  chevLeft: (c, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>,
  star: (c, s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke={c} strokeWidth="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  menu: (c, s = 22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  clock: (c, s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  mapPin: (c, s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  video: (c, s = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>,
  user: (c, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  lock: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  send: (c, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
  sun: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>,
  moon: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>,
  bell: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>,
  settings: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  mail: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  key: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>,
  database: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
  arrowRight: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  bot: (c, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><line x1="12" y1="7" x2="12" y2="11" /><line x1="8" y1="16" x2="8" y2="16.01" /><line x1="16" y1="16" x2="16" y2="16.01" /></svg>,
  calendar: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  eyeOff: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>,
  circle: (c, s = 16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>,
};

const Stars = ({ rating, color }) => (
  <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.25 }}>
        {Icons.star(color, 13)}
      </span>
    ))}
    <span style={{ marginLeft: 4, fontSize: 12.5, fontWeight: 600, opacity: 0.7 }}>{rating}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════
// PROVIDERS DATA
// ═══════════════════════════════════════════════════════════
const PROVIDERS = [
  { name: "Karen Taylor, MD", specialty: "Primary Care", rating: 4.8, distance: "1 mi away", avail: "Available today", telehealth: true, badge: "Telehealth only", initials: "KT", bio: "Dr. Karen Taylor is a board-certified internal medicine physician with over 15 years of experience. She is dedicated to providing patient-centered preventive health care and chronic disease management.", expertise: ["Primary Care", "Preventive Medicine", "Chronic Disease", "Telehealth"] },
  { name: "Andrew Morales, LMFT", specialty: "Mental Health", rating: 4.7, distance: "Over 10 years exp.", avail: "Next available: Wed", telehealth: false, badge: "In-person & Virtual", initials: "AM", bio: "Andrew Morales is a licensed marriage and family therapist specializing in anxiety, depression, and relationship counseling with a trauma-informed approach.", expertise: ["Anxiety & Depression", "Couples Therapy", "Trauma Recovery", "CBT"] },
  { name: "Ruby Patel, MD", specialty: "Dermatology", rating: 5.0, distance: "5.6 mi", avail: "Available today", telehealth: true, badge: "Accepting new patients", initials: "RP", bio: "Dr. Ruby Patel is a board-certified dermatologist specializing in medical and cosmetic dermatology with expertise in skin cancer screening.", expertise: ["Medical Dermatology", "Skin Cancer Screening", "Cosmetic Procedures", "Telehealth"] },
  { name: "Thomas White, MD", specialty: "Primary Care", rating: 4.9, distance: "2.3 mi", avail: "Available today", telehealth: true, badge: "Highly rated", initials: "TW", bio: "Dr. Thomas White provides comprehensive primary care with a focus on holistic wellness and preventive health strategies.", expertise: ["Family Medicine", "Wellness", "Preventive Care", "Geriatrics"] },
];

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════
const PhoneFrame = ({ children, theme }) => {
  const t = T[theme];
  return (
    <div style={{
      width: 390, height: 844, borderRadius: 52, overflow: "hidden",
      border: `8px solid ${theme === "dark" ? "#1a1a2e" : "#e0e0e0"}`,
      boxShadow: theme === "dark"
        ? "0 30px 80px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.05)"
        : "0 30px 80px rgba(0,0,0,0.15), inset 0 0 0 2px rgba(255,255,255,0.8)",
      background: t.bg, position: "relative", display: "flex", flexDirection: "column",
    }}>
      {/* Notch */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 160, height: 34, borderRadius: "0 0 20px 20px",
        background: theme === "dark" ? "#0a0a14" : "#1a1a1a", zIndex: 50,
      }} />
      {/* Status Bar */}
      <div style={{
        height: 54, padding: "0 28px", display: "flex", alignItems: "flex-end",
        justifyContent: "space-between", paddingBottom: 6, flexShrink: 0, zIndex: 40,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'SF Pro Display', -apple-system, sans-serif" }}>9:41</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <svg width="16" height="12" viewBox="0 0 16 12"><rect x="0" y="5" width="3" height="7" rx="0.5" fill={t.text} opacity="0.4" /><rect x="4.5" y="3" width="3" height="9" rx="0.5" fill={t.text} opacity="0.6" /><rect x="9" y="1" width="3" height="11" rx="0.5" fill={t.text} opacity="0.8" /><rect x="13" y="0" width="3" height="12" rx="0.5" fill={t.text} /></svg>
          <svg width="15" height="12" viewBox="0 0 15 12"><path d="M7.5 3.6c1.8 0 3.4.7 4.6 1.9l1.4-1.4C11.8 2.4 9.7 1.6 7.5 1.6S3.2 2.4 1.5 4.1l1.4 1.4C4.1 4.3 5.7 3.6 7.5 3.6z" fill={t.text} /><path d="M7.5 7.2c1 0 1.9.4 2.6 1l1.4-1.4c-1-1-2.4-1.6-4-1.6s-3 .6-4 1.6l1.4 1.4c.7-.6 1.6-1 2.6-1z" fill={t.text} /><circle cx="7.5" cy="10.5" r="1.5" fill={t.text} /></svg>
          <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0" y="1" width="23" height="11" rx="2" stroke={t.text} strokeWidth="1" fill="none" opacity="0.35" /><rect x="24.5" y="4" width="2" height="5" rx="1" fill={t.text} opacity="0.4" /><rect x="1.5" y="2.5" width="18" height="8" rx="1" fill={t.success} /></svg>
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
      {/* Home Indicator */}
      <div style={{
        height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <div style={{ width: 134, height: 5, borderRadius: 100, background: t.text, opacity: 0.2 }} />
      </div>
    </div>
  );
};

const MobileNav = ({ theme, title, onBack, rightAction }) => {
  const t = T[theme];
  return (
    <div style={{
      height: 48, padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: `1px solid ${t.border}`, flexShrink: 0, background: t.bgNav, backdropFilter: "blur(20px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {onBack ? (
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
            {Icons.chevLeft(t.accent)}
          </button>
        ) : (
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: t.gradient,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {Icons.shield("#fff", 15)}
          </div>
        )}
        <span style={{
          fontSize: 16, fontWeight: 700, color: t.text,
          fontFamily: "'Outfit', -apple-system, sans-serif",
        }}>
          {onBack ? "" : ""}<span style={{ color: t.accent }}>Anony</span>Health
        </span>
      </div>
      {rightAction || (
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
          {Icons.menu(t.textSec)}
        </button>
      )}
    </div>
  );
};

const BottomNav = ({ theme, current, onNavigate }) => {
  const t = T[theme];
  const items = [
    { id: "dashboard", icon: Icons.menu, label: "Dash" },
    { id: "findProvider", icon: Icons.search, label: "Find" },
    { id: "chat", icon: Icons.bot, label: "Chat" },
    { id: "register", icon: Icons.user, label: "Register" },
    { id: "settings", icon: Icons.settings, label: "Settings" },
  ];

  return (
    <div style={{
      height: 84, padding: "0 24px 20px", background: t.bgNav,
      backdropFilter: "blur(20px)", borderTop: `1px solid ${t.border}`,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      position: "relative", zIndex: 50, flexShrink: 0,
    }}>
      {items.map(item => {
        const isActive = current === item.id;
        return (
          <button key={item.id} onClick={() => onNavigate(item.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            padding: 0, minWidth: 48,
          }}>
            <div style={{
              color: isActive ? t.accent : t.textMut,
              transition: "all 0.2s",
              transform: isActive ? "translateY(-2px)" : "none",
            }}>
              {item.icon(isActive ? t.accent : t.textMut, 24)}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
              color: isActive ? t.accent : t.textMut, opacity: isActive ? 1 : 0.8,
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const FilterChip = ({ label, theme, active }) => {
  const t = T[theme];
  return (
    <button style={{
      padding: "7px 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 500,
      fontFamily: "'Outfit', sans-serif", cursor: "pointer", whiteSpace: "nowrap",
      background: active ? t.accentLight : t.chipBg,
      color: active ? t.accent : t.chipText,
      border: `1px solid ${active ? t.accent + "30" : t.border}`,
      display: "flex", alignItems: "center", gap: 4, transition: "all 0.2s",
    }}>
      {label} {Icons.chevDown(active ? t.accent : t.textMut, 12)}
    </button>
  );
};

const ProviderCard = ({ prov, theme, onSelect, compact }) => {
  const t = T[theme];
  const isDark = theme === "dark";
  return (
    <div onClick={onSelect} style={{
      padding: compact ? 16 : 24, borderRadius: compact ? 14 : 18,
      background: t.bgCard, border: `1px solid ${t.border}`,
      boxShadow: t.shadow, cursor: "pointer", transition: "all 0.25s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: compact ? 16 : 18, fontWeight: 700, color: t.text,
            fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.01em",
          }}>{prov.name}</div>
          <div style={{
            fontSize: compact ? 12.5 : 13.5, color: t.textSec, marginTop: 2,
            fontFamily: "'Outfit', sans-serif",
          }}>{prov.specialty}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: compact ? 6 : 10, flexWrap: "wrap" }}>
            <Stars rating={prov.rating} color={t.star} />
            <span style={{ fontSize: 11.5, color: t.textMut, display: "flex", alignItems: "center", gap: 3 }}>
              {Icons.mapPin(t.textMut, 11)} {prov.distance}
            </span>
          </div>
          <div style={{ fontSize: 12, color: t.textSec, marginTop: 6, fontFamily: "'Outfit', sans-serif" }}>
            {prov.telehealth ? "Telehealth available" : prov.badge}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            borderRadius: 10, background: t.accentGlow, border: `1px solid ${t.accent}15`,
          }}>
            {Icons.shield(t.accent, 14)}
            <span style={{ fontSize: 11, fontWeight: 600, color: t.accent, fontFamily: "'Outfit', sans-serif", lineHeight: 1.2 }}>
              Confidential Pre-<br />Intake Available
            </span>
          </div>
          <button style={{
            padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer",
            background: t.gradient, color: "#fff", fontSize: 13, fontWeight: 600,
            fontFamily: "'Outfit', sans-serif",
            boxShadow: isDark ? `0 0 16px ${t.accent}25` : `0 2px 10px ${t.accent}20`,
          }}>
            Start Confidentially
          </button>
        </div>
      </div>
    </div>
  );
};

const Toggle = ({ active, theme, onChange }) => {
  const t = T[theme];
  return (
    <button onClick={onChange} style={{
      width: 48, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
      background: active ? t.toggleActive : t.toggleBg, position: "relative",
      transition: "all 0.3s", padding: 0,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 11, background: "#fff",
        position: "absolute", top: 3,
        left: active ? 23 : 3, transition: "left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
};

// ═══════════════════════════════════════════════════════════
// SCREEN: FIND A PROVIDER (DESKTOP)
// ═══════════════════════════════════════════════════════════
const FindProviderDesktop = ({ theme, onSelectProvider, providers = PROVIDERS }) => {
  const t = T[theme];
  const isDark = theme === "dark";
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

// ═══════════════════════════════════════════════════════════
// SCREEN: PROVIDER DETAILS (MOBILE)
// ═══════════════════════════════════════════════════════════
const ProviderDetailsMobile = ({ theme, provider, onBack, onStartAnon, providers = PROVIDERS }) => {
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

// ═══════════════════════════════════════════════════════════
// SCREEN: PATIENT DASHBOARD (MOBILE)
// ═══════════════════════════════════════════════════════════
const PatientDashboard = ({ theme, onNavigate }) => {
  const t = T[theme];
  const isDark = theme === "dark";
  const [activityInput, setActivityInput] = useState("");

  const handleActivitySubmit = (e) => {
    if (e.key === "Enter" && activityInput.trim()) {
      onNavigate("chat", activityInput);
      setActivityInput("");
    }
  };

  return (
    <>
      <MobileNav theme={theme} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 30,
          fontWeight: 400, color: t.text, margin: "0 0 24px", letterSpacing: "-0.02em",
        }}>
          Patient Dashboard
        </h1>

        {/* Anonymous Activity */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", margin: "0 0 12px" }}>
            Confidential Activity
          </h2>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
            borderRadius: 12, background: t.bgCard, border: `1px solid ${t.border}`,
            boxShadow: t.shadow,
          }}>
            {Icons.search(t.textMut, 16)}
            <input
              value={activityInput}
              onChange={(e) => setActivityInput(e.target.value)}
              onKeyDown={handleActivitySubmit}
              placeholder="Tell us what's on your mind..."
              style={{
                border: "none", background: "transparent", outline: "none", flex: 1,
                fontSize: 14, color: t.text, fontFamily: "'Outfit', sans-serif",
              }}
            />
            <button onClick={() => onNavigate("history")} style={{
              border: "none", background: "none", cursor: "pointer", color: t.accent, fontSize: 12, fontWeight: 600
            }}>
              HISTORY
            </button>
          </div>
        </div>

        {/* Triage Results */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", margin: "0 0 12px" }}>
            Triage Results
          </h2>
          <div style={{
            padding: 18, borderRadius: 14, background: t.bgCard, border: `1px solid ${t.border}`,
            boxShadow: t.shadow, cursor: "pointer",
          }} onClick={() => onNavigate("chat")}>
            <div style={{ fontSize: 17, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>
              Sore Throat
            </div>
            <div style={{
              display: "inline-flex", padding: "4px 12px", borderRadius: 8,
              background: t.urgentBg, border: `1px solid ${t.urgentBorder}`,
              fontSize: 12, fontWeight: 700, color: t.urgentText, fontFamily: "'Outfit', sans-serif",
              marginBottom: 8,
            }}>
              Urgent
            </div>
            <div style={{ fontSize: 13.5, color: t.textSec, fontFamily: "'Outfit', sans-serif", lineHeight: 1.5 }}>
              You may require medical attention.
            </div>
          </div>
        </div>

        {/* Appointments */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", margin: "0 0 12px" }}>
            Appointments
          </h2>
          <div style={{
            padding: 18, borderRadius: 14, background: t.bgCard, border: `1px solid ${t.border}`,
            boxShadow: t.shadow, display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif" }}>Karen Taylor, MD</div>
              <div style={{ fontSize: 12.5, color: t.textSec, fontFamily: "'Outfit', sans-serif", marginTop: 2 }}>Telehealth</div>
              <div style={{
                display: "inline-flex", padding: "3px 10px", borderRadius: 6,
                background: t.accentLight, fontSize: 12, fontWeight: 600,
                color: t.accent, fontFamily: "'Outfit', sans-serif", marginTop: 6,
              }}>
                9:00 AM
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, color: t.textSec, fontFamily: "'Outfit', sans-serif", marginBottom: 8 }}>March 7, 2024</div>
              <button style={{
                padding: "8px 20px", borderRadius: 10, border: "none", cursor: "pointer",
                background: t.gradient, color: "#fff", fontSize: 13, fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
              }}>View</button>
            </div>
          </div>
        </div>

        {/* Privacy & Settings */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif", margin: "0 0 12px" }}>
            Privacy & Settings
          </h2>
          <div onClick={() => onNavigate("settings")} style={{
            padding: 18, borderRadius: 14, background: t.bgCard, border: `1px solid ${t.border}`,
            boxShadow: t.shadow, display: "flex", justifyContent: "space-between", alignItems: "center",
            cursor: "pointer",
          }}>
            <span style={{ fontSize: 14, color: t.textSec, fontFamily: "'Outfit', sans-serif" }}>
              Manage preferences, notifications, and data
            </span>
            {Icons.chevRight(t.textMut)}
          </div>
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════
// SCREEN: AI CHAT (MOBILE)
// ═══════════════════════════════════════════════════════════
const CHAT_MSGS = [
  { role: "bot", text: "Hello! I'm your AI Triage & Medical Assistant. What symptoms are you experiencing?" },
  { role: "user", text: "I've had a sore throat for several days." },
  { role: "bot", text: "Thank you — let me help. Based on your description, you may require medical attention. Would you like to book an appointment with a matching provider?" },
];

const AIChatMobile = ({ theme, initialMsg, onBack, onBook }) => {
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

// ═══════════════════════════════════════════════════════════
// SCREEN: REGISTER AS PATIENT (MOBILE)
// ═══════════════════════════════════════════════════════════
const RegisterMobile = ({ theme, onBack }) => {
  const t = T[theme];
  const isDark = theme === "dark";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [msg, setMsg] = useState("");

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateDob = (dob) => /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/.test(dob);
  const validatePassword = (pw) => pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);

  const handleAuth = async () => {
    if (!email || !password) {
      setMsg("Please enter both email and password.");
      return;
    }
    if (!validateEmail(email)) {
      setMsg("Please enter a valid email address.");
      return;
    }
    if (!isLogin && !validatePassword(password)) {
      setMsg("Password must be at least 8 characters with uppercase, lowercase, and a number.");
      return;
    }
    if (!isLogin && (!name || !dob || !address)) {
      setMsg("Please complete all fields for identity verification.");
      return;
    }
    if (!isLogin && !validateDob(dob)) {
      setMsg("Please enter date of birth in MM/DD/YYYY format.");
      return;
    }

    setLoading(true);
    setMsg("");

    const { data, error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    // On sign-up, store PII in separate RLS-protected table (not auth metadata)
    if (!isLogin && data?.user) {
      const { error: profileError } = await supabase.from('patient_profiles').insert({
        id: data.user.id,
        full_name: name.trim(),
        dob: dob,
        address: address.trim(),
        consented_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        setMsg("Account created but profile save failed. Please contact support.");
        setLoading(false);
        return;
      }

      logAuditEvent("auth.sign_up", "New patient registered with consent");
      setMsg("Success! Please check your email to confirm.");
    } else if (isLogin && data?.user) {
      logAuditEvent("auth.sign_in", "User signed in via registration page");
      setMsg("Welcome back!");
      setTimeout(() => onBack(), 800);
    }

    setLoading(false);
  };

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 30,
          fontWeight: 400, color: t.text, margin: "0 0 8px", letterSpacing: "-0.02em",
        }}>
          {isLogin ? "Welcome back" : "Confidential Registration"}
        </h1>
        <p style={{ fontSize: 13.5, color: t.textSec, fontFamily: "'Outfit', sans-serif", margin: "0 0 24px", lineHeight: 1.5 }}>
          {isLogin ? "Sign in to access your dashboard." : "Maryland law requires identity verification for telehealth. We strictly protect this data and do not bill insurance."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          {!isLogin && (
            <>
              <input
                placeholder="Legal Name (for verification)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  padding: "14px", borderRadius: 12, border: `1px solid ${t.border}`,
                  background: t.bgInput, color: t.text, fontSize: 15, fontFamily: "'Outfit', sans-serif", outline: "none",
                }}
              />
              <input
                placeholder="Date of Birth (MM/DD/YYYY)"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                style={{
                  padding: "14px", borderRadius: 12, border: `1px solid ${t.border}`,
                  background: t.bgInput, color: t.text, fontSize: 15, fontFamily: "'Outfit', sans-serif", outline: "none",
                }}
              />
              <input
                placeholder="Home Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  padding: "14px", borderRadius: 12, border: `1px solid ${t.border}`,
                  background: t.bgInput, color: t.text, fontSize: 15, fontFamily: "'Outfit', sans-serif", outline: "none",
                }}
              />
              <div style={{ fontSize: 12, color: t.textMut, fontFamily: "'Outfit', sans-serif", padding: "0 4px" }}>
                * By registering, I consent to telehealth services and affirm my identity is accurate.
              </div>
            </>
          )}

          <input
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "14px", borderRadius: 12, border: `1px solid ${t.border}`,
              background: t.bgInput, color: t.text, fontSize: 15, fontFamily: "'Outfit', sans-serif",
              outline: "none",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "14px", borderRadius: 12, border: `1px solid ${t.border}`,
              background: t.bgInput, color: t.text, fontSize: 15, fontFamily: "'Outfit', sans-serif",
              outline: "none",
            }}
          />
        </div>

        {msg && (
          <div style={{
            marginBottom: 20, padding: 12, borderRadius: 8,
            background: msg.includes("Success") || msg.includes("Welcome") ? t.successBg : t.dangerBg,
            color: msg.includes("Success") || msg.includes("Welcome") ? t.success : t.danger,
            fontSize: 13, fontFamily: "'Outfit', sans-serif",
          }}>
            {msg}
          </div>
        )}

        <button onClick={handleAuth} disabled={loading} style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: loading ? "wait" : "pointer",
          background: t.gradient, color: "#fff", fontSize: 15, fontWeight: 600,
          fontFamily: "'Outfit', sans-serif", marginBottom: 16, opacity: loading ? 0.7 : 1,
          boxShadow: isDark ? `0 0 20px ${t.accent}25` : `0 4px 16px ${t.accent}15`,
        }}>
          {loading ? "Processing..." : (isLogin ? "Sign In" : "Register & Consent")}
        </button>

        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: 14, color: t.textSec, fontFamily: "'Outfit', sans-serif" }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button onClick={() => { setIsLogin(!isLogin); setMsg(""); }} style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontSize: 14, fontWeight: 600, color: t.accent, fontFamily: "'Outfit', sans-serif",
          }}>
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════
// SCREEN: ANONYMOUS SYMPTOM REVIEW (MOBILE)
// ═══════════════════════════════════════════════════════════
const AnonReviewMobile = ({ theme, onBack, onConfirm }) => {
  const t = T[theme];
  const isDark = theme === "dark";

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px",
          borderRadius: 8, background: t.accentGlow, border: `1px solid ${t.accent}15`,
          fontSize: 11.5, fontWeight: 600, color: t.accent, fontFamily: "'Outfit', sans-serif",
          marginBottom: 16,
        }}>
          {Icons.eyeOff(t.accent, 13)} Confidential mode
        </div>

        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28,
          fontWeight: 400, color: t.text, margin: "0 0 6px", letterSpacing: "-0.02em", lineHeight: 1.15,
        }}>
          Confidential<br />symptom review
        </h1>
        <p style={{ fontSize: 14, color: t.textSec, fontFamily: "'Outfit', sans-serif", margin: "0 0 28px", lineHeight: 1.5 }}>
          with our AI agent.
        </p>

        {/* Symptom Card */}
        <div style={{
          padding: 20, borderRadius: 16, background: t.bgCard, border: `1px solid ${t.border}`,
          boxShadow: t.shadow, marginBottom: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            {Icons.shield(t.accent, 16)}
            <span style={{ fontSize: 12, fontWeight: 600, color: t.accent, fontFamily: "'Outfit', sans-serif" }}>Restricted Access Summary</span>
          </div>
          <p style={{ fontSize: 15, color: t.text, fontFamily: "'Outfit', sans-serif", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
            I've had a sore throat for several days.
          </p>
          <div style={{
            marginTop: 14, padding: "8px 14px", borderRadius: 10, background: t.urgentBg,
            border: `1px solid ${t.urgentBorder}`, display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.urgentText, fontFamily: "'Outfit', sans-serif" }}>⚠ May require medical attention</span>
          </div>
        </div>

        <button onClick={onConfirm} style={{
          width: "100%", padding: "16px", borderRadius: 14, border: "none", cursor: "pointer",
          background: t.gradient, color: "#fff", fontSize: 15, fontWeight: 700,
          fontFamily: "'Outfit', sans-serif",
          boxShadow: isDark ? `0 0 24px ${t.accent}30` : `0 4px 16px ${t.accent}20`,
        }}>
          Confirm Appointment
        </button>

        <div style={{
          display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginTop: 14,
        }}>
          {Icons.lock(t.textMut, 12)}
          <span style={{ fontSize: 11, color: t.textMut, fontFamily: "'Outfit', sans-serif" }}>
            Your records are private and never shared with insurance
          </span>
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════
// SCREEN: SETTINGS (MOBILE)
// ═══════════════════════════════════════════════════════════
const SettingsMobile = ({ theme, onBack, session, onNavigate }) => {
  const t = T[theme];
  const [notifs, setNotifs] = useState(true);
  const [updates, setUpdates] = useState(false);
  const [anon, setAnon] = useState(true);

  const SettingsRow = ({ icon, label, desc, right, border = true }) => (
    <div style={{
      padding: "16px 0", borderBottom: border ? `1px solid ${t.border}` : "none",
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: t.chipBg,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: "'Outfit', sans-serif" }}>{label}</div>
          {desc && <div style={{ fontSize: 12, color: t.textMut, fontFamily: "'Outfit', sans-serif", marginTop: 1 }}>{desc}</div>}
        </div>
      </div>
      {right}
    </div>
  );

  const handleSignOut = async () => {
    await logAuditEvent("auth.sign_out", "User signed out");
    await supabase.auth.signOut();
    onBack();
  };

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28,
          fontWeight: 400, color: t.text, margin: "0 0 4px", letterSpacing: "-0.02em",
        }}>
          Settings
        </h1>
        <p style={{ fontSize: 13, color: t.textSec, fontFamily: "'Outfit', sans-serif", margin: "0 0 24px" }}>
          Manage your account and privacy
        </p>

        {/* Account */}
        <div style={{
          padding: "4px 20px 0", borderRadius: 16, background: t.bgCard,
          border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: t.textMut, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", padding: "14px 0 4px" }}>Account</h3>
          {session ? (
            <>
              <SettingsRow icon={Icons.mail(t.accent)} label="Email" desc={session.user.email} right={Icons.chevRight(t.textMut)} />
              <button onClick={handleSignOut} style={{
                width: "100%", padding: "16px 0", border: "none", background: "none", cursor: "pointer",
                borderTop: `1px solid ${t.border}`, color: t.danger, fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                Sign Out
              </button>
            </>
          ) : (
            <div onClick={() => onNavigate("register")} style={{ padding: "16px 0", borderTop: `1px solid ${t.border}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: t.chipBg, display: "flex", alignItems: "center", justifyContent: "center" }}>{Icons.user(t.accent)}</div>
                <div style={{ fontSize: 14, color: t.accent, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>Sign In / Register</div>
              </div>
              {Icons.chevRight(t.accent)}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div style={{
          padding: "4px 20px 0", borderRadius: 16, background: t.bgCard,
          border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: t.textMut, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", padding: "14px 0 4px" }}>Notifications</h3>
          <SettingsRow icon={Icons.bell(t.accent)} label="Appointment reminders" right={<Toggle active={notifs} theme={theme} onChange={() => setNotifs(!notifs)} />} />
          <SettingsRow icon={Icons.bell(t.textMut)} label="Updates and news" right={<Toggle active={updates} theme={theme} onChange={() => setUpdates(!updates)} />} border={false} />
        </div>

        {/* Privacy */}
        <div style={{
          padding: "4px 20px 0", borderRadius: 16, background: t.bgCard,
          border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: t.textMut, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", padding: "14px 0 4px" }}>Privacy</h3>
          <SettingsRow icon={Icons.eyeOff(t.accent)} label="Anonymize patient activity" desc="Your identity will be reserved from matching providers" right={<Toggle active={anon} theme={theme} onChange={() => setAnon(!anon)} />} />
          <SettingsRow icon={Icons.database(t.accent)} label="Data Management" right={Icons.chevRight(t.textMut)} border={false} />
        </div>

        {/* Support */}
        <div style={{
          padding: "4px 20px 0", borderRadius: 16, background: t.bgCard,
          border: `1px solid ${t.border}`, boxShadow: t.shadow, marginBottom: 20,
        }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: t.textMut, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", padding: "14px 0 4px" }}>Support</h3>
          <div onClick={() => onNavigate("about")} style={{ cursor: "pointer" }}>
            <SettingsRow icon={Icons.circle(t.accent)} label="About AnonyHealth" desc="v1.0.2 • Confidential" right={Icons.chevRight(t.textMut)} border={false} />
          </div>
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════
// SCREEN: HEALTH HISTORY (MOBILE)
// ═══════════════════════════════════════════════════════════
const HistoryMobile = ({ theme, onBack }) => {
  const t = T[theme];
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('health_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const severityColor = (sev) => {
    if (sev >= 7) return t.danger;
    if (sev >= 4) return t.warn;
    return t.success;
  };

  const severityLabel = (sev) => {
    if (sev >= 7) return "High";
    if (sev >= 4) return "Moderate";
    return "Low";
  };

  return (
    <>
      <MobileNav theme={theme} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <h1 style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28,
          fontWeight: 400, color: t.text, margin: "0 0 6px", letterSpacing: "-0.02em",
        }}>
          Health History
        </h1>
        <p style={{ fontSize: 13, color: t.textSec, fontFamily: "'Outfit', sans-serif", margin: "0 0 24px" }}>
          Your previous triage sessions
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: t.textMut, fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>
            Loading...
          </div>
        ) : logs.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 40, borderRadius: 16, background: t.bgCard,
            border: `1px solid ${t.border}`, boxShadow: t.shadow,
          }}>
            <div style={{ marginBottom: 12 }}>{Icons.clock(t.textMut, 32)}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text, fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>
              No history yet
            </div>
            <div style={{ fontSize: 13, color: t.textMut, fontFamily: "'Outfit', sans-serif" }}>
              Your triage sessions will appear here after you chat with the AI assistant.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {logs.map((log) => (
              <div key={log.id} style={{
                padding: 16, borderRadius: 14, background: t.bgCard,
                border: `1px solid ${t.border}`, boxShadow: t.shadow,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.text, fontFamily: "'Outfit', sans-serif" }}>
                    {log.symptom || "Triage Session"}
                  </div>
                  {log.severity > 0 && (
                    <div style={{
                      padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                      fontFamily: "'Outfit', sans-serif",
                      background: `${severityColor(log.severity)}15`,
                      color: severityColor(log.severity),
                      border: `1px solid ${severityColor(log.severity)}30`,
                    }}>
                      {severityLabel(log.severity)} ({log.severity}/10)
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 13, color: t.textSec, fontFamily: "'Outfit', sans-serif",
                  lineHeight: 1.5, marginBottom: 8,
                }}>
                  {log.ai_advice && log.ai_advice.length > 120 ? log.ai_advice.slice(0, 120) + "..." : log.ai_advice}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: t.textMut, fontFamily: "'Outfit', sans-serif" }}>
                  {Icons.clock(t.textMut, 11)}
                  {new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════
// SCREEN: FIND PROVIDER (MOBILE)
// ═══════════════════════════════════════════════════════════
const FindProviderMobile = ({ theme, onSelectProvider, providers = PROVIDERS }) => {
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

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
// SCREEN: ABOUT & NAVIGATION (MOBILE)
// ═══════════════════════════════════════════════════════════
const AboutMobile = ({ theme, onBack }) => {
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

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// AUTH GATE — Requires Supabase authentication
// ═══════════════════════════════════════════════════════════
const AuthGate = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter email and password."); return; }
    setSubmitting(true);
    setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else if (data?.user) {
      logAuditEvent("auth.sign_in", "User signed in via AuthGate");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ fontSize: 14, color: "#64748b" }}>Loading...</div>
      </div>
    );
  }

  if (session) return children;

  return (
    <div style={{
      height: "100vh", background: "#f8fafc", fontFamily: "'Outfit', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }}>
      <div style={{
        width: "100%", maxWidth: 360, background: "#fff", padding: 32, borderRadius: 24,
        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)", textAlign: "center"
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #38bdf8, #818cf8)",
          margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 20px rgba(56,189,248,0.25)"
        }}>
          {Icons.shield("#fff", 24)}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>AnonyHealth</h2>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>Sign in to access the platform.</p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0",
            background: "#f1f5f9", fontSize: 14, marginBottom: 12, outline: "none",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 12, border: `1px solid ${error ? "#ef4444" : "#e2e8f0"}`,
            background: "#f1f5f9", fontSize: 14, marginBottom: 12, outline: "none",
            transition: "all 0.2s"
          }}
        />
        {error && (
          <div style={{ fontSize: 13, color: "#ef4444", marginBottom: 12 }}>{error}</div>
        )}
        <button onClick={handleLogin} disabled={submitting} style={{
          width: "100%", padding: "14px", borderRadius: 12, border: "none", cursor: submitting ? "wait" : "pointer",
          background: "#0f172a", color: "#fff", fontSize: 14, fontWeight: 600,
          opacity: submitting ? 0.7 : 1
        }}>
          {submitting ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </div>
  );
};

export default function AnonyHealthApp() {
  return (
    <AuthGate>
      <AnonyHealthAppContent />
    </AuthGate>
  );
}

function AnonyHealthAppContent() {
  const [theme, setTheme] = useState("light");
  const [desktopScreen, setDesktopScreen] = useState("providers");
  const [mobileScreen, setMobileScreen] = useState("dashboard");
  const [chatInitialMsg, setChatInitialMsg] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(0);
  const [providers, setProviders] = useState(PROVIDERS); // Initialize with mock, update with DB
  const [session, setSession] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [viewMode, setViewMode] = useState(window.innerWidth < 1024 ? "mobile" : "split");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProviders = async () => {
      const { data, error } = await supabase.from('providers').select('*').order('id', { ascending: true });
      if (error) console.error("Error fetching providers:", error);
      else if (data && data.length > 0) setProviders(data);
    };
    fetchProviders();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setViewMode("mobile");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const t = T[theme];
  const isDark = theme === "dark";

  const renderMobile = () => {
    switch (mobileScreen) {
      case "dashboard": return <PatientDashboard theme={theme} onNavigate={(s, msg) => {
        if (msg) setChatInitialMsg(msg);
        else setChatInitialMsg("");
        setMobileScreen(s);
      }} />;
      case "findProvider": return <FindProviderMobile theme={theme} providers={providers} onSelectProvider={(i) => { setSelectedProvider(i); setMobileScreen("providerDetail"); }} />;
      case "providerDetail": return <ProviderDetailsMobile theme={theme} provider={selectedProvider} providers={providers} onBack={() => setMobileScreen("findProvider")} onStartAnon={() => setMobileScreen("anonReview")} />;
      case "anonReview": return <AnonReviewMobile theme={theme} onBack={() => setMobileScreen("providerDetail")} onConfirm={() => setMobileScreen("dashboard")} />;
      case "chat": return <AIChatMobile theme={theme} initialMsg={chatInitialMsg} onBack={() => setMobileScreen("dashboard")} onBook={() => setMobileScreen("findProvider")} />;
      case "register": return <RegisterMobile theme={theme} onBack={() => setMobileScreen("dashboard")} />;
      case "settings": return <SettingsMobile theme={theme} session={session} onNavigate={(s) => setMobileScreen(s)} onBack={() => setMobileScreen("dashboard")} />;
      case "about": return <AboutMobile theme={theme} onBack={() => setMobileScreen("dashboard")} />;
      case "history": return <HistoryMobile theme={theme} onBack={() => setMobileScreen("dashboard")} />;
      default: return <PatientDashboard theme={theme} onNavigate={(s) => setMobileScreen(s)} />;
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: t.bg, transition: "background 0.4s",
      fontFamily: "'Outfit', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; background: ${t.bg}; }
        input::placeholder { color: ${t.textMut}; }
        ::selection { background: ${t.accent}25; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
        button { transition: all 0.2s; }
        button:hover { filter: brightness(1.04); }
        button:active { transform: scale(0.97); }
        @keyframes chatIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dotPulse { 0%,60%,100% { transform: translateY(0); opacity: 0.35; } 30% { transform: translateY(-5px); opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Dark mode ambient */}
      {isDark && (
        <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: "-15%", left: "-5%", width: "45%", height: "45%",
            background: "radial-gradient(circle, rgba(56,189,248,0.03) 0%, transparent 70%)",
            animation: "floatA 22s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", bottom: "-15%", right: "-5%", width: "50%", height: "50%",
            background: "radial-gradient(circle, rgba(192,132,252,0.03) 0%, transparent 70%)",
            animation: "floatA 28s ease-in-out infinite reverse",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `radial-gradient(${t.accent}06 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }} />
          <style>{`@keyframes floatA { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-20px); } }`}</style>
        </div>
      )}

      {/* Top Bar */}
      {/* Top Bar - Hide on mobile */}
      {!isMobile && (
        <div style={{
          position: "fixed", top: 0, left: 0, bottom: 0, width: 220, zIndex: 100,
          background: t.bgNav, backdropFilter: "blur(20px) saturate(180%)",
          borderRight: `1px solid ${t.border}`,
          padding: "24px 20px", display: "flex", flexDirection: "column", gap: 32,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 4 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: t.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isDark ? `0 0 16px ${t.accent}25` : "none",
            }}>
              {Icons.shield("#fff", 17)}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: t.text, letterSpacing: "-0.02em", lineHeight: 1 }}>
                <span style={{ color: t.accent }}>Anony</span>Health
              </span>
              <span style={{
                fontSize: 10, fontWeight: 600, color: t.accent, opacity: 0.8, letterSpacing: "0.05em", marginTop: 2
              }}>
                CONFIDENTIAL PROTO
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>

            {/* View Modes */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: 8 }}>
                View Mode
              </div>
              {["split", "desktop", "mobile"].map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif",
                  background: viewMode === mode ? t.accentLight : "transparent",
                  color: viewMode === mode ? t.accent : t.textSec,
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  transition: "all 0.2s ease"
                }}>
                  {viewMode === mode && <div style={{ width: 4, height: 4, borderRadius: 2, background: t.accent }} />}
                  {mode === "split" ? "Split View" : mode === "desktop" ? "Desktop Only" : "Mobile Only"}
                </button>
              ))}
            </div>

            {/* Mobile Screens */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.textMut, textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: 8 }}>
                Mobile Screens
              </div>
              {["dashboard", "findProvider", "chat", "register", "settings", "about"].map(s => (
                <button key={s} onClick={() => setMobileScreen(s)} style={{
                  padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif",
                  background: mobileScreen === s ? t.chipBg : "transparent",
                  color: mobileScreen === s ? t.text : t.textMut,
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  transition: "all 0.2s ease"
                }}>
                  {s === "dashboard" ? "Dashboard" : s === "findProvider" ? "Find Provider" : s === "chat" ? "AI Chat" : s === "register" ? "Register" : s === "settings" ? "Settings" : "About / Help"}
                </button>
              ))}
            </div>
          </div>

          {/* Theme Toggle */}
          <button onClick={() => setTheme(isDark ? "light" : "dark")} style={{
            width: "100%", padding: "12px", borderRadius: 12, border: `1px solid ${t.border}`,
            background: t.bgCard, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            color: t.text, fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif"
          }}>
            {isDark ? Icons.sun(t.textSec) : Icons.moon(t.textSec)}
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ paddingTop: isMobile ? 0 : 24, paddingLeft: isMobile ? 0 : 220, position: "relative", zIndex: 1, minHeight: "100vh" }}>
        {viewMode === "split" && (
          <div style={{
            display: "flex", gap: 40, padding: "48px 40px", alignItems: "flex-start",
            justifyContent: "center", minHeight: "calc(100vh - 64px)",
          }}>
            {/* Desktop */}
            <div style={{ flex: "1 1 50%", maxWidth: 860, paddingTop: 8 }}>
              <div style={{
                padding: "3px 12px", borderRadius: 6, background: t.chipBg,
                display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 20,
                border: `1px solid ${t.border}`,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: t.success }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: t.textSec, fontFamily: "'Outfit', sans-serif" }}>DESKTOP VIEW</span>
              </div>
              <FindProviderDesktop theme={theme} providers={providers} onSelectProvider={(i) => { setSelectedProvider(i); setMobileScreen("providerDetail"); }} />
            </div>

            {/* Mobile */}
            <div style={{ flexShrink: 0, position: "sticky", top: 112 }}>
              <div style={{
                padding: "3px 12px", borderRadius: 6, background: t.chipBg,
                display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 16,
                border: `1px solid ${t.border}`,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: t.accent }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: t.textSec, fontFamily: "'Outfit', sans-serif" }}>MOBILE VIEW</span>
              </div>
              <PhoneFrame theme={theme}>
                {renderMobile()}
              </PhoneFrame>
            </div>
          </div>
        )}

        {viewMode === "desktop" && (
          <div style={{ padding: "48px 40px", maxWidth: 920, margin: "0 auto" }}>
            <FindProviderDesktop theme={theme} providers={providers} onSelectProvider={(i) => { setSelectedProvider(i); setMobileScreen("providerDetail"); setViewMode("mobile"); }} />
          </div>
        )}

        {viewMode === "mobile" && (
          <div style={{ display: "flex", justifyContent: "center", padding: isMobile ? 0 : "48px 20px", height: isMobile ? "100vh" : "auto" }}>
            {isMobile ? (
              <div style={{ width: "100%", height: "100%", background: t.bg, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
                  {renderMobile()}
                </div>
                <BottomNav theme={theme} current={mobileScreen} onNavigate={setMobileScreen} />
              </div>
            ) : (
              <PhoneFrame theme={theme}>
                {renderMobile()}
              </PhoneFrame>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
