# AnonyHealth: GKE to Cloud Run Migration & Cost Optimization

> **Status:** Implemented & Verified  
> **Cost Impact:** ~98% Reduction (From ~$240/month down to <$5.00/month)  
> **Target Cloud:** Google Cloud Run (`us-central1`)  
> **Domain:** `https://anonyhealth-cg4uqokewq-uc.a.run.app` / `https://anonyhealth.opssightai.com`

---

## 1. Executive Cost Comparison

Deploying a lightweight, static Single Page Application (React 19 + Nginx) on Google Kubernetes Engine (GKE) introduces substantial unnecessary compute and management overhead. Migrating to Google Cloud Run delivers massive cost savings while improving availability and reducing maintenance.

| Cost Component | GKE Deployment (`opssightai-cluster`) | Google Cloud Run (Serverless) | Cost Savings |
| :--- | :--- | :--- | :--- |
| **Cluster Management Fee** | $73.00 / month | **$0.00** (No cluster fee) | **-$73.00** |
| **Compute Nodes (e2-medium)** | ~$150.00 / month (6 nodes 24/7) | **$0.00 – $3.00** (Scale-to-zero) | **-$147.00** |
| **External Load Balancer IP** | ~$18.00 / month | **$0.00** (Built-in HTTPS & domain mapping) | **-$18.00** |
| **Free Tier Allowance** | None | 2M requests/mo + 360k vCPU-sec free | **$0.00 tier** |
| **Monthly Total** | **~$241.00 / month** | **<$5.00 / month** | **~98% Reduction** |
| **Annualized Cost** | **$2,892.00 / year** | **<$60.00 / year** | **Save >$2,800/year** |

---

## 2. Architectural Comparison

```
[ GKE Legacy Architecture (~$241/mo) ]
Global Static IP (34.110.171.21) ──▶ ManagedCert ──▶ Ingress Controller ──▶ NodePool (6 e2-medium 24/7) ──▶ Pods
                                                                                ▲ Always running, always billing

[ Cloud Run Serverless Architecture (<$5/mo) ]
anonyhealth.opssightai.com ──▶ Google Global Edge ──▶ Cloud Run Container (Scale 0 ↔ 10)
                                                        ▲ Billed ONLY per millisecond of request execution
```

* **True Scale-to-Zero:** When no patients are triaging, 0 compute instances run, costing $0.00.
* **Instant Burst Handling:** Cloud Run scales from 0 to hundreds of instances in under 1 second during surge traffic.
* **Zero OS / Node Maintenance:** No Kubernetes version upgrades, node pool patching, or security vulnerability management on Linux VMs.
* **Built-in Managed SSL:** Automatic Let's Encrypt / Google Trust Services TLS certificate management without cert-manager or GKE controller CRDs.

---

## 3. How to Deploy to Cloud Run

### Option A: One-Command Deployment Script
A dedicated deployment script is available in the repository:
```bash
./scripts/deploy-cloudrun.sh
```
This script:
1. Submits Cloud Build to package the Docker container with Supabase secrets.
2. Pushes the image to Artifact Registry (`us-central1-docker.pkg.dev/alpfr-splunk-integration/healthcare-repo/anonyhealth`).
3. Deploys directly to Cloud Run service `anonyhealth` in `us-central1`.
4. Runs an automated health check against the live HTTPS endpoint.

### Option B: Automated CI/CD (GitHub Actions)
On every push to `main`, `.github/workflows/deploy.yml` automatically:
1. Runs linter (`npm run lint`) and all 21 unit tests (`npm run test:unit`).
2. Submits `cloudbuild.yaml` to build and deploy to Cloud Run.
3. Verifies HTTP 200 reachability and logs the production URL.

---

## 4. Custom Domain & DNS Mapping for `anonyhealth.opssightai.com`

You can map your custom domain to Cloud Run in one of two ways:

### Method 1: Direct Cloud Run Domain Mapping (Recommended - $0 Cost)
```bash
gcloud beta run domain-mappings create \
  --service=anonyhealth \
  --domain=anonyhealth.opssightai.com \
  --region=us-central1 \
  --project=alpfr-splunk-integration
```
In your DNS provider (e.g. Cloudflare, Route53, Google Cloud DNS), add:
* **Record Type:** `CNAME`
* **Name / Host:** `anonyhealth`
* **Value / Target:** `ghs.googlehosted.com.`

Google Cloud will automatically provision and renew the SSL certificate at no charge.

### Method 2: Serverless NEG via Global Load Balancer (Keeps IP `34.110.171.21`)
If you want to maintain the existing static IP address (`34.110.171.21`) and attach Google Cloud Armor WAF security policies:
```bash
# 1. Create Serverless NEG pointing to Cloud Run
gcloud compute network-endpoint-groups create anonyhealth-serverless-neg \
  --region=us-central1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=anonyhealth \
  --project=alpfr-splunk-integration

# 2. Create Backend Service
gcloud compute backend-services create anonyhealth-cloudrun-backend \
  --global \
  --project=alpfr-splunk-integration

gcloud compute backend-services add-backend anonyhealth-cloudrun-backend \
  --global \
  --network-endpoint-group=anonyhealth-serverless-neg \
  --network-endpoint-group-region=us-central1 \
  --project=alpfr-splunk-integration

# 3. Update existing URL map to route traffic to the Cloud Run backend
gcloud compute url-maps add-path-matcher anonyhealth-ingress-url-map \
  --default-service=anonyhealth-cloudrun-backend \
  --path-matcher-name=cloudrun-matcher \
  --project=alpfr-splunk-integration
```

---

## 5. Decommissioning / Scaling Down GKE to Stop Node Billing

Once DNS is pointed to Cloud Run and verified, you can eliminate the GKE node pool charges:

```bash
# Option 1: Scale node pool to 0 nodes (Freezes cluster costs immediately while preserving configuration)
gcloud container clusters resize opssightai-cluster \
  --node-pool=default-pool \
  --num-nodes=0 \
  --zone=us-central1-a \
  --project=alpfr-splunk-integration

# Option 2: Delete cluster completely (if no other workloads are running)
# gcloud container clusters delete opssightai-cluster --zone=us-central1-a --project=alpfr-splunk-integration
```
