from google.cloud import logging

def get_gemini_users(project_id):
    # Initialize the logging client (Uses Application Default Credentials)
    client = logging.Client(project=project_id)
    
    # The exact query used to filter for Gemini Data Access logs
    query = (
        f'logName="projects/{project_id}/logs/cloudaudit.googleapis.com%2Fdata_access" '
        'AND protoPayload.serviceName="aiplatform.googleapis.com"'
    )
    
    print(f"Querying Gemini API usage for project: {project_id}...\n")
    
    # Print a formatted table header
    print(f"{'TIMESTAMP':<25} | {'USER EMAIL (PRINCIPAL)':<40} | {'IP ADDRESS'}")
    print("-" * 85)
    
    # Fetch the last 50 log entries matching the query
    entries = client.list_entries(filter_=query, max_results=50)
    
    for entry in entries:
        # The audit payload is stored as a dictionary in entry.payload
        payload = entry.payload or {}
        
        # 1. Extract the user identity
        auth_info = payload.get("authenticationInfo", {})
        user_email = auth_info.get("principalEmail", "Unknown / API Key Used")
        
        # 2. Extract the IP address
        metadata = payload.get("requestMetadata", {})
        ip_address = metadata.get("callerIp", "Unknown IP")
        
        # 3. Format the timestamp
        timestamp = entry.timestamp.strftime("%Y-%m-%d %H:%M:%S") if entry.timestamp else "Unknown Time"
        
        # Print the row
        print(f"{timestamp:<25} | {user_email:<40} | {ip_address}")

if __name__ == "__main__":
    # Replace with your actual project ID
    get_gemini_users("alpfr-splunk-integration")
