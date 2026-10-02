# AnonyHealth Gemini & BigQuery Telemetry Scripts

This directory contains utility scripts to query, audit, and export Gemini AI usage and payload logs from Google Cloud BigQuery and Cloud Logging.

## Setup

```bash
# 1. Activate your python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 2. Install dependencies
pip install -r scripts/telemetry/requirements.txt

# 3. Authenticate with Google Cloud ADC
gcloud auth application-default login
```

## Available Scripts

1. **`create_bq_table.py`**: Enables Vertex AI request-response payload logging to BigQuery for model `gemini-2.5-pro`.
2. **`get_gemini_logs.py`**: Queries Cloud Audit logs (`cloudaudit.googleapis.com/data_access`) to audit user principal emails and caller IPs querying the Gemini API.
3. **`get_gemini_model_api_logs.py`**: Queries the BigQuery `request_response_logging` table to fetch raw prompt and response previews.
4. **`get_gemini_prompts_logs.py`**: Extracts token usage metrics (`promptTokenCount`, `candidatesTokenCount`, `totalTokenCount`) from BigQuery for cost and quota analytics.
