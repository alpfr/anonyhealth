#!/usr/bin/env bash
#
# verify-deployment.sh
#
# Confirms the AnonyHealth deployment pipeline ran and is healthy.
# Run after a Cloud Build to verify the new image is serving production.
#
# Usage:
#   ./scripts/verify-deployment.sh
#
# Optional env overrides:
#   GCP_PROJECT          - GCP project ID (default: from `gcloud config`)
#   GKE_CLUSTER          - cluster name (default: opssightai-cluster)
#   GKE_ZONE             - cluster zone (default: us-central1-a)
#   K8S_DEPLOYMENT       - deployment name (default: anonyhealth)
#   PROD_URL             - public URL to smoke test (default: https://anonyhealth.opssightai.com)
#   BUILD_HISTORY_LIMIT  - how many recent builds to show (default: 5)

set -euo pipefail

# ─── Config ────────────────────────────────────────────────
GCP_PROJECT="${GCP_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
GKE_CLUSTER="${GKE_CLUSTER:-opssightai-cluster}"
GKE_ZONE="${GKE_ZONE:-us-central1-a}"
K8S_DEPLOYMENT="${K8S_DEPLOYMENT:-anonyhealth}"
PROD_URL="${PROD_URL:-https://anonyhealth.opssightai.com}"
BUILD_HISTORY_LIMIT="${BUILD_HISTORY_LIMIT:-5}"

# ─── Pretty output ─────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'  # reset

section() { printf "\n${BOLD}${BLUE}━━━ %s ━━━${NC}\n" "$1"; }
ok()      { printf "${GREEN}✓${NC} %s\n" "$1"; }
warn()    { printf "${YELLOW}⚠${NC} %s\n" "$1"; }
fail()    { printf "${RED}✗${NC} %s\n" "$1"; }

# ─── Tracker ───────────────────────────────────────────────
ERRORS=0
record_error() { ERRORS=$((ERRORS + 1)); }

# ─── Pre-flight ────────────────────────────────────────────
section "Pre-flight"

if [[ -z "$GCP_PROJECT" ]]; then
  fail "No GCP project configured. Run: gcloud config set project <id>"
  exit 1
fi
ok "GCP project: ${GCP_PROJECT}"

ACTIVE_ACCOUNT="$(gcloud config get-value account 2>/dev/null || echo '<none>')"
ok "Active account: ${ACTIVE_ACCOUNT}"

for cmd in gcloud kubectl curl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    fail "Required command not found: $cmd"
    exit 1
  fi
done
ok "All required CLI tools available (gcloud, kubectl, curl)"

# ─── 1. Recent Cloud Build runs ────────────────────────────
section "Recent Cloud Build runs (last ${BUILD_HISTORY_LIMIT})"

BUILDS_JSON="$(gcloud builds list \
  --project="$GCP_PROJECT" \
  --limit="$BUILD_HISTORY_LIMIT" \
  --format='value(id,status,createTime,duration,images[0])' 2>/dev/null || true)"

if [[ -z "$BUILDS_JSON" ]]; then
  warn "No builds found. Has this pipeline ever run?"
  record_error
else
  printf "%-37s %-10s %-26s %s\n" "BUILD ID" "STATUS" "CREATED" "DURATION"
  printf "%-37s %-10s %-26s %s\n" "$(printf '─%.0s' {1..36})" "──────────" "$(printf '─%.0s' {1..25})" "──────────"
  while IFS=$'\t' read -r BUILD_ID STATUS CREATED DURATION IMAGE; do
    case "$STATUS" in
      SUCCESS)              COLOR=$GREEN ;;
      FAILURE|TIMEOUT|CANCELLED) COLOR=$RED ;;
      WORKING|QUEUED)       COLOR=$YELLOW ;;
      *)                    COLOR=$NC ;;
    esac
    printf "%-37s ${COLOR}%-10s${NC} %-26s %s\n" "$BUILD_ID" "$STATUS" "$CREATED" "$DURATION"
  done <<< "$BUILDS_JSON"
fi

# ─── 2. Most recent build details ──────────────────────────
section "Most recent build"

LATEST_BUILD_ID="$(gcloud builds list \
  --project="$GCP_PROJECT" \
  --limit=1 \
  --format='value(id)' 2>/dev/null || true)"

if [[ -z "$LATEST_BUILD_ID" ]]; then
  warn "No builds to inspect"
  record_error
else
  LATEST_STATUS="$(gcloud builds describe "$LATEST_BUILD_ID" \
    --project="$GCP_PROJECT" \
    --format='value(status)' 2>/dev/null || echo 'UNKNOWN')"
  LATEST_FINISH="$(gcloud builds describe "$LATEST_BUILD_ID" \
    --project="$GCP_PROJECT" \
    --format='value(finishTime)' 2>/dev/null || echo 'unknown')"
  LATEST_LOGS_URL="https://console.cloud.google.com/cloud-build/builds/${LATEST_BUILD_ID}?project=${GCP_PROJECT}"

  echo "  Build ID:     $LATEST_BUILD_ID"
  echo "  Finished:     $LATEST_FINISH"
  echo "  Logs URL:     $LATEST_LOGS_URL"

  if [[ "$LATEST_STATUS" == "SUCCESS" ]]; then
    ok "Latest build status: SUCCESS"
  elif [[ "$LATEST_STATUS" == "WORKING" || "$LATEST_STATUS" == "QUEUED" ]]; then
    warn "Latest build status: $LATEST_STATUS (still in progress)"
  else
    fail "Latest build status: $LATEST_STATUS"
    record_error
  fi
fi

# ─── 3. Cloud Build triggers (optional, informational) ────
section "Cloud Build triggers"

TRIGGERS="$(gcloud builds triggers list \
  --project="$GCP_PROJECT" \
  --format='value(name,github.name,filename)' 2>/dev/null || true)"

if [[ -z "$TRIGGERS" ]]; then
  warn "No Cloud Build triggers configured for this project."
  warn "Builds must be invoked manually with: gcloud builds submit --config cloudbuild.yaml"
else
  ok "Triggers configured:"
  echo "$TRIGGERS" | while IFS=$'\t' read -r NAME REPO FILE; do
    printf "  • %s  (repo: %s, config: %s)\n" "$NAME" "${REPO:-<n/a>}" "${FILE:-<n/a>}"
  done
fi

# ─── 4. GKE deployment status ──────────────────────────────
section "GKE deployment (${K8S_DEPLOYMENT})"

if ! gcloud container clusters get-credentials "$GKE_CLUSTER" \
    --zone="$GKE_ZONE" \
    --project="$GCP_PROJECT" >/dev/null 2>&1; then
  fail "Could not get credentials for cluster '$GKE_CLUSTER' in zone '$GKE_ZONE'"
  record_error
else
  ok "Cluster credentials loaded"

  if ! kubectl get deployment "$K8S_DEPLOYMENT" >/dev/null 2>&1; then
    fail "Deployment '$K8S_DEPLOYMENT' not found in current namespace"
    record_error
  else
    DESIRED=$(kubectl get deployment "$K8S_DEPLOYMENT" -o jsonpath='{.spec.replicas}')
    READY=$(kubectl get deployment "$K8S_DEPLOYMENT" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 0)
    READY=${READY:-0}
    UPDATED=$(kubectl get deployment "$K8S_DEPLOYMENT" -o jsonpath='{.status.updatedReplicas}' 2>/dev/null || echo 0)
    UPDATED=${UPDATED:-0}
    IMAGE=$(kubectl get deployment "$K8S_DEPLOYMENT" -o jsonpath='{.spec.template.spec.containers[0].image}')

    echo "  Replicas:     ${READY}/${DESIRED} ready, ${UPDATED} updated"
    echo "  Current image: ${IMAGE}"

    if [[ "$READY" == "$DESIRED" && "$UPDATED" == "$DESIRED" ]]; then
      ok "All replicas ready and on the latest image"
    else
      warn "Rollout incomplete (ready=$READY desired=$DESIRED updated=$UPDATED)"
      record_error
    fi

    # Cross-reference image with latest successful build
    if [[ -n "${LATEST_BUILD_ID:-}" && "${LATEST_STATUS:-}" == "SUCCESS" ]]; then
      if [[ "$IMAGE" == *"$LATEST_BUILD_ID"* ]]; then
        ok "Deployed image matches latest successful build ID"
      else
        warn "Deployed image does NOT match latest build ($LATEST_BUILD_ID)"
        warn "Production may be running an older build."
      fi
    fi

    # Pod status
    echo
    echo "  Pods:"
    kubectl get pods -l "app=${K8S_DEPLOYMENT}" \
      --no-headers 2>/dev/null | awk '{ printf "    %-50s %-10s %-12s %s\n", $1, $2, $3, $5 }' || \
      warn "Could not list pods (label selector may differ)"
  fi
fi

# ─── 5. Production smoke test ──────────────────────────────
section "Production smoke test (${PROD_URL})"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$PROD_URL" || echo "000")
case "$HTTP_CODE" in
  200|301|302|304) ok "HTTP $HTTP_CODE — site responding" ;;
  000)             fail "Could not reach $PROD_URL (timeout or DNS issue)"; record_error ;;
  5*)              fail "HTTP $HTTP_CODE — server error"; record_error ;;
  *)               warn "HTTP $HTTP_CODE — unexpected status" ;;
esac

# Look for the AnonyHealth bundle in the response
BODY_SAMPLE=$(curl -s --max-time 10 "$PROD_URL" 2>/dev/null | head -c 4000 || true)
if echo "$BODY_SAMPLE" | grep -qi "anonyhealth\|<title>\|<div id=\"root\""; then
  ok "Page content looks like the AnonyHealth SPA"
else
  warn "Response body didn't contain expected SPA markers"
fi

# ─── Summary ───────────────────────────────────────────────
section "Summary"
if [[ "$ERRORS" -eq 0 ]]; then
  printf "${GREEN}${BOLD}✓ Deployment verified — everything looks healthy.${NC}\n\n"
  exit 0
else
  printf "${RED}${BOLD}✗ ${ERRORS} issue(s) detected. Review the warnings/errors above.${NC}\n\n"
  exit 1
fi
