// Public legal pages. Reachable without authentication so users can review
// before signing up.
//
// IMPORTANT: the content below is a starting template. It is NOT legal
// advice and MUST be reviewed by a healthcare attorney before going live.
// Anywhere you see {{PLACEHOLDER}}, replace with your actual values.

const COMPANY_LEGAL_NAME = "ALPFR LLC";
const COMPANY_ADDRESS = "6214 Autumn Haven Ct, Hanover, MD 21076";
const PRIVACY_EMAIL = "privacy@alpfr.com";
const SUPPORT_EMAIL = "support@alpfr.com";
const PHI_RETENTION_YEARS = "6";
const EFFECTIVE_DATE = "October 2, 2026";

const TERMS = `
# Terms of Service

**Effective date: ${EFFECTIVE_DATE}**

These Terms of Service ("Terms") form an agreement between ${COMPANY_LEGAL_NAME} ("AnonyHealth", "we", "us") and the person or entity using the service (a "Provider" if you are a healthcare professional or their practice, a "Patient" if you are an individual receiving care through the platform).

## 1. Eligibility
- Providers must hold a valid, current license to practice in every state from which their patients receive care, must comply with all applicable telehealth regulations, and represent that all care delivered through the platform is within the scope of their license.
- Patients must be at least 18 years old, or be the legal guardian of a minor for whom they are accepting these Terms.

## 2. Roles and responsibilities
AnonyHealth is a software platform. We are not a medical provider. We do not provide diagnosis, treatment, or medical advice. The Provider — not AnonyHealth — is solely responsible for the medical care delivered to their patients.

## 3. Subscription, billing, and trials
- Provider subscriptions renew monthly until cancelled. The current price is shown at signup.
- A free trial period may be offered. After the trial, the saved payment method is charged automatically until cancellation.
- Cancel any time from your billing portal. Cancellation takes effect at the end of the current billing period.
- All payments are processed by Stripe; we do not store full card numbers.

## 4. Acceptable use
You will not use AnonyHealth to: (a) violate any law, including HIPAA, state telehealth or licensing rules, or anti-spam regulations; (b) impersonate any person or entity; (c) upload malicious code; (d) reverse engineer or attempt to extract source code; (e) collect personally identifiable information about other users beyond what the service provides.

## 5. Patient data and PHI
Providers acknowledge that they act as the HIPAA covered entity (or business associate, as applicable) and AnonyHealth acts as a business associate. A Business Associate Agreement ("BAA") is incorporated by reference and available on request to ${PRIVACY_EMAIL}. Patients consent to their information being shared with the Provider whose invitation they accepted.

## 6. AI-assisted features
The platform may include AI-generated content (for example, AI symptom triage). This content is informational only and is not medical advice. Providers retain professional responsibility for any clinical decisions.

## 7. Intellectual property
AnonyHealth, including all software, design, and content (excluding User Content), is owned by ${COMPANY_LEGAL_NAME}. We grant you a limited, non-exclusive, non-transferable license to use the service for its intended purpose during your subscription. User Content (data and messages you upload) remains yours.

## 8. Termination
We may suspend or terminate access for material breach of these Terms, non-payment, fraud, or use that creates risk to the platform or other users. You may terminate at any time by cancelling your subscription. On termination, data retention follows our Privacy Notice and the BAA.

## 9. Disclaimers
The service is provided "as is" and "as available". We disclaim all warranties to the maximum extent permitted by law. We do not warrant uninterrupted or error-free operation.

## 10. Limitation of liability
To the maximum extent permitted by law, our aggregate liability for any claim arising under these Terms is limited to the fees you paid us in the 12 months prior to the event giving rise to the claim. Neither party will be liable for indirect, special, or consequential damages.

## 11. Governing law and disputes
These Terms are governed by the laws of the State of Maryland, without regard to conflict of laws. Disputes will be resolved in the state or federal courts located in Anne Arundel County, Maryland, except where prohibited by law.

## 12. Changes
We may update these Terms. We will provide at least 14 days' notice (by email or in-app) for material changes. Continued use after the effective date constitutes acceptance.

## 13. Contact
${COMPANY_LEGAL_NAME}
${COMPANY_ADDRESS}
${SUPPORT_EMAIL}
`;

const PRIVACY = `
# Privacy Notice

**Effective date: ${EFFECTIVE_DATE}**

This Privacy Notice describes how ${COMPANY_LEGAL_NAME} collects, uses, and shares information when you use AnonyHealth. For protected health information ("PHI") please also see our **Notice of Privacy Practices** (HIPAA).

## What we collect
- **Account info**: email, password (hashed), and authentication metadata.
- **Provider profile**: practice name, credentials, specialty, bio, optional avatar URL.
- **Patient profile**: full name, date of birth, address, consent timestamp (PHI).
- **Triage and messaging**: symptom descriptions, AI advice, message bodies (PHI).
- **Audit log**: timestamps, event types, IP, and user agent of security-relevant actions.
- **Billing**: handled by Stripe. We see only the customer id, subscription status, and last 4 of the card.

## How we use it
- Operate the service and provide it to you.
- Bill you (Provider) and let Patients interact with their Provider.
- Detect and prevent abuse, fraud, and unauthorized access.
- Comply with legal obligations.

## Sharing
- **Subprocessors**: Supabase (hosting, Postgres, Auth, Edge Functions), Anthropic (AI triage; PHI may be transmitted), Google Cloud (frontend hosting), Stripe (billing). Each is bound by a contract that meets BAA standards where required.
- **With your Provider**: Patient PHI is only shared with the Provider whose invite the Patient accepted.
- **Legal**: We may disclose information when required by valid legal process, to protect rights or safety, or as otherwise permitted by HIPAA.

## How long we keep it
- Subscription and billing records: ${PHI_RETENTION_YEARS} years after termination, as required by law.
- PHI: ${PHI_RETENTION_YEARS} years after the last patient interaction. After Provider cancellation, all tenant data is deleted 30 days into the grace period unless the Provider exports first.
- Audit logs: ${PHI_RETENTION_YEARS} years.

## Your rights
You may request access, correction, or deletion of your information by writing to ${PRIVACY_EMAIL}. Patients have additional rights under HIPAA, described in the Notice of Privacy Practices.

## Security
Encryption in transit (TLS 1.2+) and at rest. Audit logging on all PHI access. Tenant-level isolation enforced at the database with row-level security.

## Contact
${COMPANY_LEGAL_NAME}
${COMPANY_ADDRESS}
${PRIVACY_EMAIL}
`;

const HIPAA = `
# HIPAA Notice of Privacy Practices

**Effective date: ${EFFECTIVE_DATE}**

This notice describes how medical information about you may be used and disclosed and how you can access this information. **Please review carefully.**

## Who this notice applies to
${COMPANY_LEGAL_NAME} provides software services to healthcare Providers. We act as a **Business Associate** to those Providers under HIPAA. Your healthcare Provider is the Covered Entity. This notice describes our practices when handling PHI on behalf of your Provider.

## Uses and disclosures of PHI
- **Treatment**: We share PHI with the Provider whose invitation you accepted, including AI-assisted triage outputs the Provider reviews.
- **Payment**: Billing handled by your Provider. We do not bill Patients directly. Stripe receives only non-PHI identifiers (your Provider's tenant id, your email).
- **Operations**: We use PHI to operate, monitor, and secure the platform; to detect abuse; and to provide support.
- **Required by law**: Court order, subpoena, public-health reporting, or other obligation.
- **With your authorization**: Any other disclosure requires your written authorization, which you can revoke in writing.

## What we will NOT do
- Sell your PHI.
- Use PHI for marketing without your authorization.
- Share PHI with employers or insurers without your authorization, except as required by law.

## Your HIPAA rights
You have the right to:
1. **Access** your PHI and receive a copy.
2. **Amend** your PHI if you believe it is incorrect.
3. **Accounting of disclosures** — a list of certain disclosures we have made.
4. **Restrict** certain uses and disclosures.
5. **Confidential communications** at an alternate address or means.
6. **Receive notice of breach** affecting your PHI.
7. **Receive a paper copy** of this notice.

To exercise any of these rights, contact ${PRIVACY_EMAIL}.

## Complaints
You may complain to your Provider, to ${COMPANY_LEGAL_NAME} at ${PRIVACY_EMAIL}, or to the Secretary of the U.S. Department of Health and Human Services. We will not retaliate for filing a complaint.

## Subprocessors
We use Supabase (Postgres + storage + auth), Anthropic (AI), Google Cloud (frontend hosting), and Stripe (billing only — no PHI). Each subprocessor that touches PHI is bound by a Business Associate Agreement.

## Changes
We may revise this notice. Material changes will be posted with 14 days' advance notice.

## Contact
${COMPANY_LEGAL_NAME}
${COMPANY_ADDRESS}
${PRIVACY_EMAIL}
`;

const PAGES = {
    terms: { title: "Terms of Service", body: TERMS },
    privacy: { title: "Privacy Notice", body: PRIVACY },
    hipaa: { title: "HIPAA Notice", body: HIPAA },
};

// Tiny markdown renderer — intentionally minimal. Only handles the
// constructs used in the templates above (#, ##, **bold**, lists, paragraphs).
function renderMarkdown(text) {
    const lines = text.trim().split("\n");
    const out = [];
    let listBuf = [];
    const flushList = () => {
        if (listBuf.length) {
            out.push(<ul key={out.length} style={{ paddingLeft: 20, marginBottom: 12 }}>
                {listBuf.map((l, i) => <li key={i} style={{ marginBottom: 4 }}>{renderInline(l)}</li>)}
            </ul>);
            listBuf = [];
        }
    };
    for (const raw of lines) {
        const line = raw.trim();
        if (!line) { flushList(); continue; }
        if (line.startsWith("# ")) {
            flushList();
            out.push(<h1 key={out.length} style={{ fontSize: 28, fontWeight: 700, margin: "16px 0 12px" }}>{line.slice(2)}</h1>);
        } else if (line.startsWith("## ")) {
            flushList();
            out.push(<h2 key={out.length} style={{ fontSize: 18, fontWeight: 700, margin: "20px 0 8px" }}>{line.slice(3)}</h2>);
        } else if (line.startsWith("- ")) {
            listBuf.push(line.slice(2));
        } else {
            flushList();
            out.push(<p key={out.length} style={{ margin: "0 0 12px", lineHeight: 1.6 }}>{renderInline(line)}</p>);
        }
    }
    flushList();
    return out;
}

function renderInline(text) {
    const parts = [];
    let i = 0;
    let key = 0;
    const re = /\*\*(.+?)\*\*/g;
    let m;
    let lastIdx = 0;
    while ((m = re.exec(text)) !== null) {
        if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
        parts.push(<strong key={key++}>{m[1]}</strong>);
        lastIdx = m.index + m[0].length;
        i = lastIdx;
    }
    if (i < text.length) parts.push(text.slice(i));
    return parts.length ? parts : text;
}

export const LegalPage = ({ kind }) => {
    const page = PAGES[kind];
    if (!page) return null;
    return (
        <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24, fontFamily: "'Outfit', sans-serif", color: "#0f172a" }}>
            <div style={{ maxWidth: 760, margin: "0 auto", background: "#fff", padding: "32px 36px", borderRadius: 16, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}>
                <a href="/" style={{ fontSize: 13, color: "#38bdf8", textDecoration: "none" }}>&larr; Back</a>
                <div style={{ marginTop: 16, fontSize: 14, color: "#0f172a" }}>
                    {renderMarkdown(page.body)}
                </div>
            </div>
        </div>
    );
};

export const LEGAL_KINDS = Object.keys(PAGES);
