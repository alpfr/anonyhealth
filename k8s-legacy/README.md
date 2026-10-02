# Legacy Kubernetes (GKE) Manifests

> **Status:** Archived & Deprecated  
> **Active Target:** Google Cloud Run (`cloudbuild.yaml` / `scripts/deploy-cloudrun.sh`)

These Kubernetes manifests (`deployment.yaml`, `hpa.yaml`, `network-policy.yaml`, `pdb.yaml`, `service.yaml`) were used during the initial GKE deployment (`opssightai-cluster`).

They have been superseded by Google Cloud Run for scale-to-zero serverless operation and ~98% cost optimization. For details on the migration and architecture, see [`docs/MIGRATION_GKE_TO_CLOUDRUN.md`](../docs/MIGRATION_GKE_TO_CLOUDRUN.md).
