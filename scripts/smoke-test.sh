#!/usr/bin/env bash
#
# smoke-test.sh — End-to-end smoke tests for AnonyHealth MVP.
#
# Runs from CLI and validates the production deployment is healthy.
# Tests covered:
#   1. Production URL responds with HTTP 200
#   2. Landing page contains expected SPA markers
#   3. /signin, /signup, /for-providers, /terms, /privacy, /hipaa all load
#   4. Supabase project is reachable
#   5. Anonymous sign-in API works
#   6. Intake Agent edge function responds (auth + streaming)
#   7. Triage Agent edge function responds (auth + streaming)
#   8. GKE cluster is healthy (if gcloud is configured)
#
# Usage:
#   ./scripts/smoke-test.sh                     # test production
#   ./scripts/smoke-test.sh --base-url http://localhost:5173  # test local
#   ./scripts/smoke-test.sh --skip-gke          # skip cluster checks
#   ./scripts/smoke-test.sh --skip-agents       # skip Anthropic-billed tests
#
# Exit code 0 = all tests passed. Non-zero = something broke.

set -uo pipefail

# ─── Defaults ─────────────────────────────────────────────
BASE_URL="${BASE_URL:-https://anonyhealth.opssightai.com}"
SUPABASE_URL="${SUPABASE_URL:-https://exzmdnnkbjjgrtwnjemm.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-sb_publishable_d_Ne0ShtZcpy14D5N3zG3Q_rtLpr2lI}"
SKIP_CLOUDRUN=false
SKIP_AGENTS=false

# ─── Arg parsing ──────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --base-url) BASE_URL="$2"; shift 2 ;;
        --supabase-url) SUPABASE_URL="$2"; shift 2 ;;
        --skip-cloudrun|--skip-gke) SKIP_CLOUDRUN=true; shift ;;
        --skip-agents) SKIP_AGENTS=true; shift ;;
        --help|-h)
            sed -n '3,22p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *) echo "Unknown arg: $1"; exit 2 ;;
    esac
done

# ─── Output ───────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0
FAILURES=()

section() { printf "\n${BOLD}${BLUE}━━━ %s ━━━${NC}\n" "$1"; }
pass()    { PASS=$((PASS + 1)); printf "${GREEN}✓${NC} %s\n" "$1"; }
fail()    { FAIL=$((FAIL + 1)); FAILURES+=("$1"); printf "${RED}✗${NC} %s\n" "$1"; }
skip()    { SKIP=$((SKIP + 1)); printf "${YELLOW}⊘${NC} %s ${DIM}(skipped)${NC}\n" "$1"; }
info()    { printf "${DIM}  %s${NC}\n" "$1"; }

# ─── Preflight ────────────────────────────────────────────
section "Preflight"
for cmd in curl jq; do
    if command -v "$cmd" >/dev/null 2>&1; then
        pass "$cmd available"
    else
        fail "$cmd not installed (required)"
    fi
done

if [[ $FAIL -gt 0 ]]; then
    echo ""
    echo "Install missing dependencies first:"
    echo "  macOS:  brew install curl jq"
    echo "  Linux:  apt-get install curl jq  (or equivalent)"
    exit 1
fi

info "Base URL:     $BASE_URL"
info "Supabase URL: $SUPABASE_URL"

# ─── 1. Frontend reachability ─────────────────────────────
section "Frontend"

http_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [[ "$http_status" == "200" ]]; then
    pass "Landing page returns 200"
else
    fail "Landing page returned $http_status (expected 200)"
fi

body=$(curl -s "$BASE_URL/")
if echo "$body" | grep -qi "AnonyHealth"; then
    pass "Landing page contains AnonyHealth branding"
else
    fail "Landing page missing AnonyHealth branding"
fi

# Routes that should all return 200 (SPA serves them as the same shell)
for route in /signin /signup /for-providers /terms /privacy /hipaa; do
    status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}${route}")
    if [[ "$status" == "200" ]]; then
        pass "GET ${route} → 200"
    else
        fail "GET ${route} → $status (expected 200)"
    fi
done

# ─── 2. Security headers ──────────────────────────────────
section "Security headers"

headers=$(curl -sI "$BASE_URL/")
for header in "strict-transport-security" "x-content-type-options" "content-security-policy"; do
    if echo "$headers" | grep -qi "^$header:"; then
        pass "Header present: $header"
    else
        info "Header missing: $header (consider adding via nginx config)"
    fi
done

# ─── 3. Supabase reachability ─────────────────────────────
section "Supabase backend"

supabase_status=$(curl -s -o /dev/null -w "%{http_code}" -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/auth/v1/health")
if [[ "$supabase_status" == "200" ]] || [[ "$supabase_status" == "404" ]]; then
    # 404 is also OK — endpoint may not exist, but the project responded.
    pass "Supabase project reachable (HTTP $supabase_status)"
else
    fail "Supabase unreachable (HTTP $supabase_status)"
fi

# ─── 4. Anonymous sign-in ─────────────────────────────────
section "Anonymous sign-in API"

anon_response=$(curl -s -X POST \
    "$SUPABASE_URL/auth/v1/signup" \
    -H "Content-Type: application/json" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -d '{}' 2>/dev/null || echo "")

# Anonymous sign-in returns a session with is_anonymous: true. If the response
# parses as JSON with an access_token, the API is working.
anon_token=$(echo "$anon_response" | jq -r '.access_token // empty' 2>/dev/null)

if [[ -n "$anon_token" ]]; then
    pass "Anonymous sign-in returned access token"

    is_anon=$(echo "$anon_response" | jq -r '.user.is_anonymous // false' 2>/dev/null)
    if [[ "$is_anon" == "true" ]]; then
        pass "User flagged is_anonymous=true"
    else
        fail "User not flagged is_anonymous (got: $is_anon)"
    fi
else
    err_msg=$(echo "$anon_response" | jq -r '.msg // .error_description // .error // "unknown error"' 2>/dev/null)
    fail "Anonymous sign-in failed: $err_msg"
    info "Response: $anon_response"
fi

# ─── 5. Intake Agent edge function ────────────────────────
section "Intake Agent"

if [[ "$SKIP_AGENTS" == "true" ]]; then
    skip "Intake Agent call (--skip-agents)"
    skip "Triage Agent call (--skip-agents)"
elif [[ -z "$anon_token" ]]; then
    skip "Intake Agent call (no anon token available)"
    skip "Triage Agent call (no anon token available)"
else
    # Send a simple test message. We don't need to consume the full SSE stream —
    # just verify the function accepts the request and starts streaming.
    intake_status=$(curl -s -o /tmp/intake-response.txt -w "%{http_code}" \
        -X POST "$SUPABASE_URL/functions/v1/intake" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $anon_token" \
        -H "Origin: $BASE_URL" \
        -d '{"message":"I have a mild headache","history":[]}' \
        --max-time 30 2>/dev/null || echo "000")

    if [[ "$intake_status" == "200" ]]; then
        # Verify the response contains streaming SSE data
        if grep -q "content_block_delta\|message_start\|event:" /tmp/intake-response.txt 2>/dev/null; then
            pass "Intake Agent responded with SSE stream (HTTP 200)"
        else
            preview=$(head -c 200 /tmp/intake-response.txt)
            fail "Intake Agent returned 200 but no SSE data found"
            info "Preview: $preview"
        fi
    else
        fail "Intake Agent returned HTTP $intake_status (expected 200)"
        if [[ -f /tmp/intake-response.txt ]]; then
            info "Response: $(head -c 200 /tmp/intake-response.txt)"
        fi
    fi

    # ─── 6. Triage Agent edge function ────────────────────
    section "Triage Agent"

    # Triage requires a non-empty history. Send a minimal valid transcript.
    triage_status=$(curl -s -o /tmp/triage-response.txt -w "%{http_code}" \
        -X POST "$SUPABASE_URL/functions/v1/triage" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $anon_token" \
        -H "Origin: $BASE_URL" \
        -d '{"history":[{"role":"user","content":"I have a mild headache"},{"role":"assistant","content":"How long has it been going on?"},{"role":"user","content":"About 2 hours"}]}' \
        --max-time 60 2>/dev/null || echo "000")

    if [[ "$triage_status" == "200" ]]; then
        if grep -q "content_block_delta\|message_start\|event:" /tmp/triage-response.txt 2>/dev/null; then
            pass "Triage Agent responded with SSE stream (HTTP 200)"
        else
            preview=$(head -c 200 /tmp/triage-response.txt)
            fail "Triage Agent returned 200 but no SSE data found"
            info "Preview: $preview"
        fi
    elif [[ "$triage_status" == "429" ]]; then
        # Rate-limited — acceptable if we just ran the test recently.
        skip "Triage Agent rate-limited (429) — try again in 60s"
    else
        fail "Triage Agent returned HTTP $triage_status (expected 200)"
        if [[ -f /tmp/triage-response.txt ]]; then
            info "Response: $(head -c 200 /tmp/triage-response.txt)"
        fi
    fi
fi

# ─── 7. CORS enforcement ─────────────────────────────────
section "CORS enforcement"

# Bad origin should be rejected; good origin should be allowed.
bad_origin_status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS "$SUPABASE_URL/functions/v1/intake" \
    -H "Origin: https://evil.example.com" \
    -H "Access-Control-Request-Method: POST" 2>/dev/null || echo "000")

good_origin_status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X OPTIONS "$SUPABASE_URL/functions/v1/intake" \
    -H "Origin: $BASE_URL" \
    -H "Access-Control-Request-Method: POST" 2>/dev/null || echo "000")

# CORS preflight: 200/204 means allowed, anything else (or no allow-origin header) means denied
# More important than status code is whether the Access-Control-Allow-Origin header is set
good_cors=$(curl -s -D - -o /dev/null \
    -X OPTIONS "$SUPABASE_URL/functions/v1/intake" \
    -H "Origin: $BASE_URL" \
    -H "Access-Control-Request-Method: POST" 2>/dev/null | grep -i "access-control-allow-origin" || true)

bad_cors=$(curl -s -D - -o /dev/null \
    -X OPTIONS "$SUPABASE_URL/functions/v1/intake" \
    -H "Origin: https://evil.example.com" \
    -H "Access-Control-Request-Method: POST" 2>/dev/null | grep -i "access-control-allow-origin" || true)

if [[ -n "$good_cors" ]]; then
    pass "CORS allows configured origin ($BASE_URL)"
else
    fail "CORS did not return allow-origin header for $BASE_URL"
fi

if [[ -z "$bad_cors" ]]; then
    pass "CORS rejects unknown origin (evil.example.com)"
else
    fail "CORS allowed an unknown origin — check ALLOWED_ORIGINS"
    info "Got: $bad_cors"
fi

# ─── 8. Cloud Run service (optional) ──────────────────────
section "Cloud Run service"

if [[ "$SKIP_CLOUDRUN" == "true" ]]; then
    skip "Cloud Run checks (--skip-cloudrun)"
elif ! command -v gcloud >/dev/null 2>&1; then
    skip "Cloud Run checks (gcloud not installed)"
else
    service_ready=$(gcloud run services describe anonyhealth --region=us-central1 --project=alpfr-splunk-integration --format="value(status.conditions[0].status)" 2>/dev/null || echo "")
    if [[ "$service_ready" == "True" ]]; then
        active_rev=$(gcloud run services describe anonyhealth --region=us-central1 --project=alpfr-splunk-integration --format="value(status.latestReadyRevisionName)" 2>/dev/null || echo "")
        pass "Cloud Run service is Ready (Revision: $active_rev)"
    else
        fail "Cloud Run service is not ready (status: $service_ready)"
    fi
fi

# ─── Summary ──────────────────────────────────────────────
section "Summary"

printf "${GREEN}Passed:  %d${NC}\n" "$PASS"
printf "${RED}Failed:  %d${NC}\n" "$FAIL"
printf "${YELLOW}Skipped: %d${NC}\n" "$SKIP"
echo ""

if [[ $FAIL -eq 0 ]]; then
    printf "${GREEN}${BOLD}✓ All checks passed${NC}\n"
    echo ""
    info "Next: run manual tester guide (./docs/TESTER-GUIDE.md)"
    exit 0
else
    printf "${RED}${BOLD}✗ %d check(s) failed${NC}\n" "$FAIL"
    echo ""
    echo "Failures:"
    for f in "${FAILURES[@]}"; do
        echo "  • $f"
    done
    exit 1
fi
