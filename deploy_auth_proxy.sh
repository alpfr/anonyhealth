#!/bin/bash
set -e

PROJECT_ID="alpfr-splunk-integration"
REGION="us-central1"
SERVICE_NAME="auth-proxy"

echo "Deploying Auth Proxy to Cloud Run..."

cd gcp-functions/auth-proxy

gcloud run deploy $SERVICE_NAME \
  --source . \
  --project $PROJECT_ID \
  --region $REGION \
  --allow-unauthenticated \
  --clear-vpc-connector \
  --network=default \
  --subnet=default \
  --vpc-egress=private-ranges-only \
  --set-env-vars="POSTGREST_URL=http://postgrest.default.svc.cluster.local:80" \
  --set-secrets="PGRST_JWT_SECRET=postgrest-jwt-secret:latest" \
  --labels="app=auth-proxy"

echo "Deployment completed!"
