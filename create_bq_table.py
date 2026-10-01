import vertexai
# 🌟 Fix: Use the preview module where the logging config method actually exists
from vertexai.preview.generative_models import GenerativeModel

PROJECT_ID = "alpfr-splunk-integration"
REGION = "us-east4" 

vertexai.init(project=PROJECT_ID, location=REGION)

model = GenerativeModel("gemini-2.5-pro")

# Turn on the payload logging
model.set_request_response_logging_config(
    enabled=True,
    sampling_rate=1.0, 
    bigquery_destination=f"bq://{PROJECT_ID}"
)

print("Request-Response logging is now enabled!")
response = model.generate_content("Hello, this is a test prompt to trigger logging.")
print(response.text)
