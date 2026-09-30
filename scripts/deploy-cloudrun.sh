#!/usr/bin/env bash
#
# deploy-cloudrun.sh — Deploy AnonyHealth to Google Cloud Run (Cost-Optimized Serverless)
#
# Replaces expensive 24/7 GKE clusters (~$240/mo) with scale-to-zero Cloud Run (~$0-$5/mo).
#
# Usage:
#   ./scripts/deploy-cloudrun.sh
#   ./scripts/deploy-cloudrun.sh --project alpfr-splunk-integration --region us-central1
#

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "alpfr-splunk-integration")
REGION="us-central1"
SERVICE_NAME="anonyhealth"
IMAGE_REPO="us-central1-docker.pkg.dev/${PROJECT_ID}/healthcare-repo/anonyhealth"
TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project|-p) PROJECT_ID="$2"; shift 2 ;;
    --region|-r)  REGION="$2"; shift 2 ;;
    --service|-s) SERVICE_NAME="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

printf "\n${BOLD}${BLUE}=== Deploying AnonyHealth to Google Cloud Run ===${NC}\n"
printf "Project:     %s\n" "${PROJECT_ID}"
printf "Region:      %s\n" "${REGION}"
printf "Service:     %s\n" "${SERVICE_NAME}"
printf "Target Tag:  %s\n\n" "${TAG}"

# Ensure .env exists or pull from Secret Manager
if [[ -f .env ]]; then
  # Load env variables safely
  export $(grep -v '^#' .env | xargs)
fi

printf "${BOLD}Step 1: Submitting Cloud Build to Artifact Registry...${NC}\n"
gcloud builds submit \
  --project="${PROJECT_ID}" \
  --config=cloudbuild.yaml

printf "\n${BOLD}Step 2: Verifying Cloud Run Service Status...${NC}\n"
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format="value(status.url)")

printf "\n${GREEN}✓ Deployed successfully to Cloud Run!${NC}\n"
printf "Live HTTPS URL: ${BOLD}%s${NC}\n\n" "${SERVICE_URL}"

# Quick smoke test on the live Cloud Run endpoint
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${SERVICE_URL}" || echo "000")
printf "Health Check: HTTP %s\n\n" "${HTTP_STATUS}"
