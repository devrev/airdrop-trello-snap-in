import axios from 'axios';

// Server URLs
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_URL = 'http://localhost:8002';
export const DEVREV_SERVER_URL = 'http://localhost:8003';

// Environment variables
export function getEnvVar(name: string, required = true): string {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Environment variable ${name} is required but not set`);
  }
  return value || '';
}

// Get Trello credentials from environment
export function getTrelloCredentials() {
  return {
    apiKey: getEnvVar('TRELLO_API_KEY'),
    token: getEnvVar('TRELLO_TOKEN'),
    organizationId: getEnvVar('TRELLO_ORGANIZATION_ID')
  };
}

// Create a function input for testing
export function createFunctionInput(functionName: string, payload: Record<string, any> = {}) {
  const { apiKey, token } = getTrelloCredentials();
  
  return {
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-service-account-token',
        actor_session_token: 'test-actor-session-token'
      }
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: functionName,
      event_type: 'test-event-type',
      devrev_endpoint: DEVREV_SERVER_URL
    },
    input_data: {
      global_values: {},
      event_sources: {}
    },
    payload: {
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'Test Organization',
        key: `key=${apiKey}&token=${token}`,
        key_type: 'api_key'
      },
      ...payload
    }
  };
}

// Send a request to the snap-in server
export async function callSnapInFunction(functionName: string, payload: Record<string, any> = {}) {
  const functionInput = createFunctionInput(functionName, payload);
  
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, functionInput);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Snap-in server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}