import axios from 'axios';

const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';

/**
 * Makes a request to the Test Snap-In Server
 * @param functionName The name of the function to call
 * @param payload The payload to send with the request
 * @returns The response from the server
 */
export async function callSnapInFunction(functionName: string, payload: Record<string, any> = {}) {
  try {
    // Get Trello credentials from environment variables
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const orgId = process.env.TRELLO_ORGANIZATION_ID;
    
    if (!apiKey || !token || !orgId) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
    }
    
    // Create a non-empty payload with connection data
    const defaultPayload = {
      connection_data: {
        key: `key=${apiKey}&token=${token}`,
        org_id: orgId
      }
    };
    
    // Merge the default payload with any provided payload
    const event = {
      payload: { ...defaultPayload, ...payload },
      context: { 
        dev_oid: 'test-dev-oid',
        source_id: 'test-source-id',
        snap_in_id: 'test-snap-in-id',
        snap_in_version_id: 'test-snap-in-version-id',
        service_account_id: 'test-service-account-id',
        secrets: {
          service_account_token: 'test-token'
        }
      },
      execution_metadata: {
        request_id: 'test-request-id',
        function_name: functionName,
        event_type: 'test-event-type',
        devrev_endpoint: 'http://localhost:8003'
      },
      input_data: {
        global_values: {},
        event_sources: {}
      }
    };

    const response = await axios.post(SNAP_IN_SERVER_URL, event, {
      timeout: 10000, // Add timeout to prevent hanging connections
    });
    
    // Check if the response has the expected structure
    if (!response.data || !response.data.function_result) {
      throw new Error(`Unexpected response structure: ${JSON.stringify(response.data)}`);
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}