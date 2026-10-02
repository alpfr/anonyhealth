from google.cloud import bigquery
import json

def get_gemini_payloads(project_id, dataset_name):
    # Initialize the BigQuery client
    client = bigquery.Client(project=project_id)
    
    # Query the auto-generated logging table
    query = f"""
        SELECT 
            logging_time, 
            request_payload, 
            response_payload 
        FROM 
            `{project_id}.{dataset_name}.request_response_logging`
        ORDER BY 
            logging_time DESC
        LIMIT 10
    """
    
    print(f"Fetching Gemini Prompts from BigQuery...\n")
    print(f"{'TIMESTAMP':<25} | {'PROMPT (REQUEST)':<40} | {'GEMINI RESPONSE'}")
    print("-" * 100)
    
    query_job = client.query(query)
    
    for row in query_job:
        # Format the timestamp
        timestamp = row.logging_time.strftime("%Y-%m-%d %H:%M:%S") if row.logging_time else "Unknown"
        
        # Payloads are stored as JSON strings in BigQuery. 
        # For terminal readability, we will cast them to strings and truncate them to 35 characters.
        # In your real Splunk script, you would parse the full JSON object!
        prompt_preview = str(row.request_payload)[:35] + "..." if row.request_payload else "No Prompt"
        response_preview = str(row.response_payload)[:35] + "..." if row.response_payload else "No Response"
        
        print(f"{timestamp:<25} | {prompt_preview:<40} | {response_preview}")

if __name__ == "__main__":
    # Replace with your actual project ID and the dataset name you found in the BigQuery console
    get_gemini_payloads("alpfr-splunk-integration", "YOUR_AUTO_GENERATED_DATASET_NAME")
