from google.cloud import bigquery

def get_gemini_token_usage(project_id, dataset_name):
    # Initialize the BigQuery client
    client = bigquery.Client(project=project_id)
    
    # 🌟 Fix: Added [SAFE_OFFSET(0)] to extract the JSON string from the Array
    query = f"""
        SELECT 
            logging_time,
            JSON_EXTRACT_SCALAR(response_payload[SAFE_OFFSET(0)], '$.usageMetadata.promptTokenCount') AS prompt_tokens,
            JSON_EXTRACT_SCALAR(response_payload[SAFE_OFFSET(0)], '$.usageMetadata.candidatesTokenCount') AS response_tokens,
            JSON_EXTRACT_SCALAR(response_payload[SAFE_OFFSET(0)], '$.usageMetadata.totalTokenCount') AS total_tokens
        FROM 
            `{project_id}.{dataset_name}.request_response_logging`
        ORDER BY 
            logging_time DESC
        LIMIT 50
    """
    
    print("Fetching Gemini Token Usage from BigQuery...\n")
    
    # Print a formatted table header
    print(f"{'TIMESTAMP':<22} | {'PROMPT TOKENS':<15} | {'RESPONSE TOKENS':<17} | {'TOTAL TOKENS'}")
    print("-" * 75)
    
    query_job = client.query(query)
    
    for row in query_job:
        # Format the timestamp
        timestamp = row.logging_time.strftime("%Y-%m-%d %H:%M:%S") if row.logging_time else "Unknown Time"
        
        # If a request failed or crashed, tokens might be null. Default to 0.
        prompt_tokens = row.prompt_tokens or "0"
        response_tokens = row.response_tokens or "0"
        total_tokens = row.total_tokens or "0"
        
        # Print the row
        print(f"{timestamp:<22} | {prompt_tokens:<15} | {response_tokens:<17} | {total_tokens}")

if __name__ == "__main__":
    # Ensure this matches your exact dataset name
    get_gemini_token_usage("alpfr-splunk-integration", "publishers_google_models_gemini_2_5_pro_1176937037580730368")
