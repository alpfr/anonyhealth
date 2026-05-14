#!/usr/bin/env bash
#
# setup-github-deploy.sh
#
# One-time setup for GitHub Actions → GCP deployment. Creates a service
# account with exactly the permissions needed to run cloudbuild.yaml and
# deploy to GKE, then prints the GitHub secrets to configure.
#
# Run once from any machine that has gcloud + active credentials.

set -euo pipefail

# ─── Config ────────────────────────────────────────────────
GCP_PROJECT="${GCP_PROJECT:-$(gcloud config get-value project 2>/dev/null)}"
SA_NAME="${SA_NAME:-github-deploy}"
SA_EMAIL="${SA_NAME}@${GCP_PROJECT}.iam.gserviceaccount.com"
KEY_FILE="${KEY_FILE:-/tmp/github-deploy-key.json}"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

section() { printf "\n${BOLD}━━━ %s ━━━${NC}\n" "$1"; }
ok()      { printf "${GREEN}✓${NC} %s\n" "$1"; }
warn()    { printf "${YELLOW}⚠${NC} %s\n" "$1"; }

if [[ -z "$GCP_PROJECT" ]]; then
  echo "No GCP project. Run: gcloud config set project <id>"
  exit 1
fi

section "Project & service account"
echo "  Project:         ${GCP_PROJECT}"
echo "  Service account: ${SA_EMAIL}"

# Create the service account if missing.
if gcloud iam service-accounts describe "$SA_EMAIL" --project="$GCP_PROJECT" >/dev/null 2>&1; then
  ok "Service account already exists"
else
  gcloud iam service-accounts create "$SA_NAME" \
    --project="$GCP_PROJECT" \
    --display-name="GitHub Actions Deploy" \
    --description="Used by GitHub Actions to deploy anonyhealth"
  ok "Service account created"
fi

# ─── IAM roles ────────────────────────────────────────────
# We grant only what cloudbuild.yaml + GKE rollout verification require:
#   - cloudbuild.builds.editor    → submit builds
#   - storage.admin               → upload source to Cloud Build's bucket
#   - artifactregistry.writer     → push images
#   - container.developer         → kubectl get/rollout against GKE
#   - secretmanager.secretAccessor → cloudbuild.yaml reads VITE_SUPABASE_* secrets
#   - iam.serviceAccountUser      → required to run Cloud Build as the default SA
#
# Grant each as a project-level binding. Adjust to per-resource binds later
# if you want stricter least-privilege.

section "IAM bindings"
ROLES=(
  "roles/cloudbuild.builds.editor"
  "roles/storage.admin"
  "roles/artifactregistry.writer"
  "roles/container.developer"
  "roles/secretmanager.secretAccessor"
  "roles/iam.serviceAccountUser"
)

# Service account creation is eventually consistent — wait for it to be
# visible to IAM before adding bindings. Retry the first binding until
# it succeeds, then assume propagation is complete for the rest.
echo "  Waiting for service account to propagate..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if gcloud iam service-accounts describe "$SA_EMAIL" \
      --project="$GCP_PROJECT" >/dev/null 2>&1; then
    sleep 3  # extra buffer for IAM propagation
    break
  fi
  sleep 2
done

for ROLE in "${ROLES[@]}"; do
  # Retry binding up to 5 times in case IAM is still propagating.
  for attempt in 1 2 3 4 5; do
    if gcloud projects add-iam-policy-binding "$GCP_PROJECT" \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="$ROLE" \
        --condition=None \
        --quiet >/dev/null 2>&1; then
      ok "$ROLE"
      break
    fi
    if [[ $attempt -eq 5 ]]; then
      echo "  ✗ Failed to bind $ROLE after 5 attempts"
      exit 1
    fi
    sleep 3
  done
done

# ─── Key generation ───────────────────────────────────────
section "Service account key"
warn "About to generate a new JSON key. This is the credential GitHub will use."
warn "Treat it like a password — never commit it to the repo."

gcloud iam service-accounts keys create "$KEY_FILE" \
  --iam-account="$SA_EMAIL" \
  --project="$GCP_PROJECT"

ok "Key written to $KEY_FILE"

# ─── GitHub secret instructions ───────────────────────────
section "Configure GitHub secrets"
echo ""
echo "1. Open: https://github.com/<your-org>/anonyhealth/settings/secrets/actions"
echo ""
echo "2. Add the following Repository secrets:"
echo ""
printf "   ${BOLD}GCP_PROJECT_ID${NC}\n"
echo "     Value: ${GCP_PROJECT}"
echo ""
printf "   ${BOLD}GCP_SA_KEY${NC}\n"
echo "     Value: (paste the entire contents of ${KEY_FILE})"
echo ""
echo "   To copy the key contents to clipboard (macOS):"
echo "     pbcopy < ${KEY_FILE}"
echo ""

section "Test the workflow"
echo ""
echo "After adding secrets:"
echo "  1. Commit and push the workflow file (.github/workflows/deploy.yml)"
echo "  2. Go to GitHub → Actions tab"
echo "  3. The workflow runs automatically on push to main"
echo "  4. Or trigger manually: Actions → Deploy to Production → Run workflow"
echo ""

section "Cleanup reminder"
echo ""
warn "After adding GCP_SA_KEY to GitHub, delete the local key file:"
echo "  rm ${KEY_FILE}"
echo ""
warn "If you ever suspect the key is leaked, revoke it immediately:"
echo "  gcloud iam service-accounts keys list --iam-account=${SA_EMAIL}"
echo "  gcloud iam service-accounts keys delete <KEY_ID> --iam-account=${SA_EMAIL}"
echo ""
