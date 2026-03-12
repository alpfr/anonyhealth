# AnonyHealth: Architecture Overview

AnonyHealth is built as a privacy-centric, cloud-native web application. The architecture separates the client-side user experience from a secure backend database and AI edge processing layer, ensuring scalable and compliant operation on Google Kubernetes Engine (GKE).

## 1. System Components

### Frontend (Client Layer)
- **Framework:** React 19 / Vite 7 for rapid rendering and state management.
- **Styling:** CSS flexbox/grid architecture dynamically adapting to a custom split-view (Desktop/Mobile preview) and fully responsive layouts.
- **Routing:** Client-side routing managed within the React Single Page Application (SPA).
- **Hosting Engine:** Served via lightweight, high-performance `Nginx` container.

### Backend & Database (Data Layer)
- **Provider:** Supabase
- **Database:** PostgreSQL storing isolated datasets:
  - `providers`: Directory of healthcare experts (Public Read).
  - `health_logs`: Time-stamped user triage history spanning symptoms and severity scores. Row-Level Security (RLS) restricts access entirely to the authenticated user.
  - `patient_profiles`: Securely houses Personal Identifiable Information (PII) required for telehealth compliance independently from authentication metadata.
- **Authentication:** Supabase Auth providing JWT-based session management.

### Artificial Intelligence (Logic Layer)
- **Engine:** Anthropic Claude (claude-3-haiku).
- **Execution:** Isolated Supabase Edge Functions (`aichat`).
- **Data Flow:** The frontend communicates directly with the Edge Function, which proxies the request cleanly to Anthropic. It abstracts away sensitive API keys from the client and guarantees that AI interactions are strictly logged to the user's isolated `health_logs` table.

---

## 2. Security & Compliance Architecture

The system is designed with a "Privacy-First" methodology, specifically mapping to stringent telehealth policies (e.g., Maryland Telehealth Compliance).

1. **Row Level Security (RLS):** Policies are enforced directly at the PostgreSQL database level. A compromised frontend cannot bypass RLS to read another patient's triage logs or profile.
2. **PII Isolation:** Identities (Name, DOB, Address) and explicit consent timestamps are securely walled off in `patient_profiles`, ensuring the `health_logs` themselves remain largely anonymized from the core routing logic.
3. **Edge Processing:** AI prompts are generated and sent via Edge Functions, actively preventing prompt-injection attacks on the client side.

---

## 3. Deployment Architecture

The entire stack is containerized for deployment on **Google Kubernetes Engine (GKE)**.

- **Containerization:** A multi-stage Docker build handles NPM compilation before passing pure static assets to an alpine Nginx base image.
- **Workload Management:** Driven by Kubernetes `Deployment` (`deployment.yaml`). Configured for auto-healing and minimum 2 replicas for High Availability (HA).
- **Load Balancing:** Cloud Load Balancing maps external traffic directly via a Kubernetes `Service` (`service.yaml`).
- **Resource Constraints:** Strict CPU (`500m`) and Memory (`256Mi`) limits are enforced at the pod level to prevent runaway AI loops from consuming excessive cloud billing resources.
