# AnonyHealth: Repository Directory Mapping

This document provides a highly annotated map of the AnonyHealth repository, outlining where the frontend user interface, backend edge logic, continuous integration, and Kubernetes platform engineering elements are located.

```text
anonyhealth/
├── docs/                   # Business and Technical documentation
│   ├── ARCHITECTURE.md     # Technical stack and security overview
│   ├── DESIGN.md           # UI/UX philosophy and styling guide
│   ├── PITCH_DECK.md       # Value proposition and sales pitch
│   └── SALES_TEMPLATES.md  # Cold outreach and clinical calling scripts
├── public/                 # Static assets compiled cleanly into the root build
├── src/                    # Primary Frontend React source code
│   ├── assets/             # Internal React import assets (e.g., SVG icon graphics)
│   ├── App.jsx             # Massive monolithic rendering system (UI, State, Routing)
│   ├── App.css             # Specific component-level styling overrides
│   ├── index.css           # Global typography, resets, and Light/Dark CSS variables
│   ├── main.jsx            # React root injection point into index.html
│   └── supabaseClient.js   # Centralized connection wrapper for the Supabase backend
├── supabase/               # Backend data stores and AI processing logic
│   └── functions/          # Serverless Deno Edge Functions
│       └── aichat/         
│           └── index.ts    # Anthropic API bridge, triage logic, JSON schema enforcement
├── .env                    # Local environment variables (Supabase URLs and Keys)
├── .gitignore              # Files explicitly ignored by Version Control
├── cloudbuild.yaml         # Google Cloud Build configuration for automated CI/CD pipelines
├── deployment.yaml         # Primary GKE Deployment map (Images, Replicas, Compute Resources)
├── Dockerfile              # Multi-stage dockerization logic (NPM build -> Nginx serving)
├── eslint.config.js        # Strict JavaScript syntax enforcement rules
├── hpa.yaml                # Kubernetes Horizontal Pod Autoscaler (for traffic scaling)
├── index.html              # Vite raw entry template and metadata layer
├── network-policy.yaml     # Strict zero-trust Kubernetes internal firewall rules
├── nginx.conf              # Custom Alpine Nginx settings forcing SPA routing
├── package.json            # Node.js workspace, runtime scripts, and framework definitions
├── pdb.yaml                # Pod Disruption Budget ensuring minimum uptime on GKE
├── service.yaml            # Kubernetes internet-facing LoadBalancer networking configuration
├── supabase_schema.sql     # PostgreSQL table definitions, mock data injects, and Row Level Security bounds 
└── vite.config.js          # Core Vite bundler configuration parameters
```
