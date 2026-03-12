# AnonyHealth: Technical Findings & Recommendations

This document summarizes the technical findings from deploying the Auth Proxy architecture and outlines key recommendations for transitioning the AnonyHealth prototype to a production-ready state.

## 1. Technical Findings: Auth Proxy Deployment

The core challenge addressed was bridging Google's Identity Platform (Firebase Auth) with a backend PostgREST database requiring specific PostgreSQL `role` claims, while avoiding Firebase's native limitations regarding custom JWT minting.

### Architecture Overview
- **Identity Provider:** Google Identity Platform (Firebase Auth) handles frontend user registration, login, and secure session management.
- **Auth Proxy (Middleware):** A lightweight Node.js Express service deployed on Google Cloud Run. It sits inside the VPC and intercepts requests from the frontend.
- **Responsibility:** The proxy validates the incoming Firebase ID token using the Firebase Admin SDK. Upon successful validation, it uses a symmetric secret (`PGRST_JWT_SECRET`) to sign a new JSON Web Token (JWT). This explicitly injects the mandatory `role: authenticated` claim required by PostgREST.
- **Database (PostgREST):** Receives the requests enriched with the new, role-asserting JWTs, enabling normal PostgreSQL queries within the GKE cluster.
- **Networking:** Deployed using Direct VPC Egress (`--network=default`, `--subnet=default`, `--vpc-egress=private-ranges-only`), bypassing the need for complex Serverless VPC Access Connectors and resolving previous subnet collision issues.

### Resolved Issues
1.  **Nginx Content-Security-Policy (CSP):** The initial frontend deployment blocked external network requests to `identitytoolkit.googleapis.com` and the new Cloud Run Auth Proxy. This was resolved by appending these endpoints to the `connect-src` directive in `nginx.conf`.
2.  **GKE Cluster Zone Resolution:** `cloudbuild.yaml` failed to deploy the application because `kubectl` defaulted to searching for a regional cluster. This was fixed by supplying `CLOUDSDK_COMPUTE_ZONE=us-central1-a` to accurately target the zonal `opssightai-cluster`.
3.  **Authentication Flow Gap:** The prototype login UI lacked a "Sign Up" option. We implemented a seamless "Auto-Registration" routine where, if `signInWithPassword` throws an `invalid-credential` or `not-found` error, the application automatically triggers `signUp` behind the scenes, ensuring zero friction for testing.

---

## 2. Recommendations for Production Rollout

As AnonyHealth moves beyond the prototype stage, the following enhancements should be prioritized to ensure security, scalability, and maintainability.

### 2.1 Refine the Authentication & Onboarding Flow
- **Disable Auto-Registration:** The seamless auto-signup on failed login is excellent for testing but presents security and compliance risks in production. Separate the Login and Registration flows completely.
- **Terms & Consent Gateway:** Introduce a mandatory step during registration for users to explicitly agree to Terms of Service, HIPAA privacy practices, and telehealth consent prior to account creation.
- **Email Verification:** Configure Firebase Auth to require users to verify their email address before the Auth Proxy will issue a `role: authenticated` JWT for PostgREST access.

### 2.2 Strengthen Database Row Level Security (RLS)
- **Multi-tenant Data Isolation:** Currently, the Auth Proxy mints a new JWT asserting `role: authenticated`. To ensure users can only access their personal health records, the proxy must be updated to extract the user's `uid` from the verified Firebase token and inject it into the PostgREST JWT (e.g., as the `sub` claim).
- **Strict PostgreSQL Policies:** Once the `sub` claim is present, define strict RLS policies on your tables. Example:
  `CREATE POLICY "Users view own logs" ON health_logs FOR SELECT USING (auth.uid() = user_id);`

### 2.3 Frontend Security Best Practices
- **App Check Configuration:** Protect your Firebase and API endpoints from abuse (e.g., bot registrations, credential stuffing) by implementing Firebase App Check (reCAPTCHA Enterprise or Apple DeviceCheck).
- **Environment Management:** While Firebase API keys are designed to be public (assuming strict security rules), ensure that actual backend secrets (like `PGRST_JWT_SECRET`) remain strictly within Google Secret Manager and are never leaked to the client codebase.

### 2.4 Infrastructure Monitoring & Alerts
- **Auth Proxy Observability:** The Cloud Run Auth Proxy acts as the critical bottleneck connecting the frontend to the database. Establish Google Cloud Logging metrics to monitor:
  - High rates of `401 Unauthorized` responses (indicating potential token abuse or configuration drift).
  - High rates of `500 Internal Server Error` responses (indicating the proxy lost communication with the GKE PostgREST service).
- **Automated Alerting:** Configure alerts via email or Slack if these error rates exceed acceptable thresholds.

### 2.5 Automated CI/CD Workflows
- **GitHub Actions / Cloud Build Triggers:** Transition away from manual deployments (`gcloud builds submit`). Configure Cloud Build or GitHub Actions to automatically trigger pipeline execution upon merging code into the `main` branch. This ensures a consistent, auditable, and repeatable path to the `opssightai-cluster`.
