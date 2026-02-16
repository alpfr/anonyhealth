# AnonyHealth 🛡️

**Privacy-first Healthcare Triage Prototype**

AnonyHealth connects patients with healthcare providers while maintaining strict privacy standards. It features an anonymous AI symptom checker, provider search, and secure patient authentication.

## ✨ Features

*   **🔍 Provider Directory**: Real-time list of healthcare providers fetched from **Supabase**.
*   **🧠 AI Triage Chat**: Intelligent symptom analysis powered by **Anthropic Claude 3.5 Sonnet** (via Supabase Edge Functions).
*   **🔐 Secure Authentication**:
    *   **Supabase Auth**: Email/Password Sign Up & Sign In.
    *   **Password Gate**: Prototype is protected by a password (`ops123`) to prevent unauthorized access.
*   **🎨 Modern UI**:
    *   **Sidebar Navigation**: Intuitive layout for desktop and mobile.
    *   **Responsive Design**: Optimized for all screen sizes.
    *   **Dark Mode**: Native support for light and dark themes.
*   **🛡️ Security**:
    *   `robots.txt` to block crawlers.
    *   Environment variables for API keys.

## 🚀 Tech Stack

*   **Frontend**: React (Vite), JavaScript.
*   **Backend**: Supabase (PostgreSQL, Auth, Edge Functions).
*   **AI**: Anthropic Claude API.
*   **Infrastructure**: Docker, Nginx, Google Kubernetes Engine (GKE).

## 🛠️ Getting Started

### Prerequisites

*   Node.js (v18+)
*   Supabase Account
*   Docker (for containerization)

### Installation

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Setup**:
    Create `.env`:
    ```env
    VITE_SUPABASE_URL=your_url
    VITE_SUPABASE_ANON_KEY=your_key
    ```

3.  **Supabase Setup**:
    *   Run `supabase_schema.sql` in Supabase SQL Editor.
    *   Deploy Edge Function:
        ```bash
        supabase functions deploy aichat --no-verify-jwt
        supabase secrets set ANTHROPIC_API_KEY=sk-...
        ```

4.  **Run Locally**:
    ```bash
    npm run dev
    ```
    Access at `http://localhost:5173`.
    *(Password: `ops123`)*

## 📦 Deployment

### Docker Build
```bash
docker build --platform linux/amd64 -t your-repo/anonyhealth:latest .
docker push your-repo/anonyhealth:latest
```

### Kubernetes (GKE)
```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

## 📄 License

Proprietary Prototype.
