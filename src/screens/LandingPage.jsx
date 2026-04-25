// Public marketing landing. Shown at "/" when no one is signed in. Provides
// the value proposition, pricing, and a "Sign up as provider" CTA that
// drops the visitor onto the auth flow.
//
// The signed-in app is reachable at the same URL — AuthGate detects the
// session and renders the in-app UI instead of this page.

const PRICE = "$49";

export const LandingPage = ({ onPrimaryAction, onSignIn }) => {
  return (
    <div style={{ minHeight: "100vh", background: "#fff", color: "#0f172a", fontFamily: "'Outfit', -apple-system, sans-serif" }}>
      <Nav onSignIn={onSignIn} />

      <Hero onCta={onPrimaryAction} />

      <section style={sectionStyle}>
        <h2 style={h2Style}>Run your private practice online in 10 minutes</h2>
        <div style={featureGrid}>
          <Feature
            title="Patient triage"
            body="AI-assisted symptom intake your patients use between visits. You see the summary and severity score at a glance."
          />
          <Feature
            title="Secure messaging"
            body="HIPAA-grade 1:1 conversations with each patient. End-to-end audited. Every read/send is logged."
          />
          <Feature
            title="Patient history"
            body="Per-patient triage history with severity color coding. Drill in for the AI advice and timestamps."
          />
          <Feature
            title="Patient invites"
            body="Bring your existing patients on board with a single-use link. No mass email blasts, no public directory."
          />
          <Feature
            title="14-day free trial"
            body="No charge until day 15. Cancel anytime from Stripe's billing portal. Export your data on cancellation."
          />
          <Feature
            title="Audit ready"
            body="Append-only audit log of every PHI access, sign-in, and message — yours to export for SOC 2 / HIPAA reviews."
          />
        </div>
      </section>

      <section style={{ ...sectionStyle, background: "#f8fafc" }}>
        <h2 style={h2Style}>Simple pricing</h2>
        <div style={{
          maxWidth: 420, margin: "32px auto 0", padding: 32, borderRadius: 16,
          background: "#fff", border: "1px solid #e2e8f0", textAlign: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontSize: 14, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            Solo Provider
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, marginTop: 8 }}>
            {PRICE}<span style={{ fontSize: 16, fontWeight: 500, color: "#64748b" }}> /month</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "20px 0", textAlign: "left" }}>
            {["Unlimited patients", "AI triage included", "Secure messaging", "Per-patient history", "Audit log export", "Stripe-managed billing"].map((f) => (
              <li key={f} style={{ padding: "6px 0", display: "flex", gap: 8 }}>
                <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span> {f}
              </li>
            ))}
          </ul>
          <button onClick={onPrimaryAction} style={primaryBtn}>
            Start 14-day free trial
          </button>
          <div style={{ marginTop: 12, fontSize: 11, color: "#94a3b8" }}>
            No card charged until day 15. Cancel anytime.
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>Built for compliance</h2>
        <p style={{ maxWidth: 680, margin: "16px auto 0", textAlign: "center", color: "#475569", lineHeight: 1.7 }}>
          We sign Business Associate Agreements with our subprocessors so you can rely on AnonyHealth for HIPAA-regulated data.
          Tenant-level row-level security at the database, audit logging on every PHI access, append-only audit table, and
          server-side validation of every privileged action. See our <a href="/hipaa" style={{ color: "#38bdf8" }}>HIPAA Notice</a>.
        </p>
      </section>

      <Footer />
    </div>
  );
};

const Nav = ({ onSignIn }) => (
  <header style={{
    padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
    maxWidth: 1100, margin: "0 auto",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #38bdf8, #818cf8)",
      }} />
      <span style={{ fontWeight: 800, fontSize: 18 }}>
        <span style={{ color: "#38bdf8" }}>Anony</span>Health
      </span>
    </div>
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <a href="/terms" style={navLinkStyle}>Terms</a>
      <a href="/privacy" style={navLinkStyle}>Privacy</a>
      <button onClick={onSignIn} style={ghostBtn}>Sign in</button>
    </div>
  </header>
);

const Hero = ({ onCta }) => (
  <section style={{
    padding: "80px 24px 56px", maxWidth: 880, margin: "0 auto", textAlign: "center",
  }}>
    <div style={{
      display: "inline-block", padding: "6px 12px", borderRadius: 999,
      background: "#e0f2fe", color: "#0369a1", fontSize: 12, fontWeight: 700,
      letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 24,
    }}>
      For solo healthcare providers
    </div>
    <h1 style={{
      fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 56, fontWeight: 400,
      letterSpacing: "-0.02em", lineHeight: 1.05, margin: "0 0 20px",
    }}>
      Your private practice,<br/>online in 10 minutes.
    </h1>
    <p style={{ fontSize: 17, color: "#475569", lineHeight: 1.6, maxWidth: 600, margin: "0 auto 32px" }}>
      AI symptom triage, secure patient messaging, and per-patient history — without a marketplace, without ads, without your patients ever seeing another doctor.
    </p>
    <button onClick={onCta} style={primaryBtn}>
      Start 14-day free trial
    </button>
    <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
      No credit card charged until day 15.
    </div>
  </section>
);

const Feature = ({ title, body }) => (
  <div style={{
    padding: 24, borderRadius: 16, background: "#fff", border: "1px solid #e2e8f0",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  }}>
    <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.55 }}>{body}</div>
  </div>
);

const Footer = () => (
  <footer style={{ padding: "32px 24px 48px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
    <div style={{ marginBottom: 8 }}>
      <a href="/terms" style={{ color: "#94a3b8", textDecoration: "none", margin: "0 8px" }}>Terms</a> ·
      <a href="/privacy" style={{ color: "#94a3b8", textDecoration: "none", margin: "0 8px" }}>Privacy</a> ·
      <a href="/hipaa" style={{ color: "#94a3b8", textDecoration: "none", margin: "0 8px" }}>HIPAA</a>
    </div>
    © {new Date().getFullYear()} AnonyHealth. All rights reserved.
  </footer>
);

const sectionStyle = { padding: "64px 24px", maxWidth: 1100, margin: "0 auto" };
const h2Style = {
  fontFamily: "'Instrument Serif', Georgia, serif",
  fontSize: 36, fontWeight: 400, textAlign: "center", margin: 0, letterSpacing: "-0.01em",
};
const featureGrid = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 32,
};
const navLinkStyle = { color: "#475569", textDecoration: "none", fontSize: 14 };
const primaryBtn = {
  padding: "14px 28px", borderRadius: 12, border: "none", cursor: "pointer",
  background: "#0f172a", color: "#fff", fontSize: 15, fontWeight: 600,
  boxShadow: "0 8px 20px rgba(15,23,42,0.15)",
};
const ghostBtn = {
  padding: "8px 16px", borderRadius: 10, border: "1px solid #e2e8f0",
  background: "#fff", color: "#0f172a", fontSize: 14, fontWeight: 600, cursor: "pointer",
};
