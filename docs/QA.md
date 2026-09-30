# AnonyHealth QA

Two artifacts for MVP validation:

## 1. CLI Smoke Test — `scripts/smoke-test.sh`

Automated end-to-end checks runnable from the terminal. Tests what's
scriptable: network reachability, edge function behavior, CORS enforcement,
GKE pod health.

### Run it

```bash
# Test production (default)
./scripts/smoke-test.sh

# Test local dev environment
./scripts/smoke-test.sh --base-url http://localhost:5173

# Skip GKE checks if you don't have gcloud configured
./scripts/smoke-test.sh --skip-gke

# Skip Anthropic-billed agent tests (free runs)
./scripts/smoke-test.sh --skip-agents

# See all options
./scripts/smoke-test.sh --help
```

### What it tests

| # | Test | What it verifies |
|---|---|---|
| 1 | Frontend reachability | Production URL returns 200, has AnonyHealth markers |
| 2 | All public routes load | /signin, /signup, /for-providers, legal pages |
| 3 | Security headers | HSTS, X-Content-Type-Options, CSP (informational) |
| 4 | Supabase backend | Auth service is reachable |
| 5 | Anonymous sign-in | `signInAnonymously` returns valid session with `is_anonymous=true` |
| 6 | Intake Agent | Edge function returns 200 with SSE stream |
| 7 | Triage Agent | Edge function returns 200 with SSE stream |
| 8 | CORS enforcement | Allowed origins pass, unknown origins blocked |
| 9 | GKE cluster | 2/2 pods ready, image matches deployment |

Exit code is 0 if all checks pass, non-zero if any fail. Suitable for use
in CI/CD or scheduled monitoring.

### Cost note

Tests 6 and 7 make real Anthropic API calls (a few cents per run). Use
`--skip-agents` if running frequently from CI to avoid burning Claude credits.

## 2. Tester Guide — `docs/TESTER-GUIDE.md`

Human-readable test plan for a manual QA pass. Walks a tester through 7
scenarios covering anonymous use, account upgrade, signup paths, mobile
responsiveness, and privacy sanity checks.

### How to use it

1. Share `docs/TESTER-GUIDE.md` with your QA person (or use it yourself)
2. They go through each scenario sequentially
3. They fill out the bug report template for any issues found
4. They sign off on the summary checklist at the bottom

Plan ~45-60 minutes of tester time per full pass.

## Recommended Workflow

**Before a release / demo / customer test:**

```bash
# 1. Run automated checks
./scripts/smoke-test.sh

# 2. If green, hand the tester guide to a human
# 3. Fix anything they find
# 4. Re-run smoke test
# 5. Ship
```

**On a schedule (e.g., daily cron):**

```bash
# Lightweight monitoring — skip the agent calls to save money
./scripts/smoke-test.sh --skip-agents
```

## File Layout

```
qa/
├── README.md                  # this file
├── scripts/
│   └── smoke-test.sh          # CLI test runner
└── docs/
    └── TESTER-GUIDE.md        # human tester walkthrough
```
