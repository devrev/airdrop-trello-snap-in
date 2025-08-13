import axios, { AxiosResponse } from 'axios';

const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';

/**
 * Creates a function input event for testing
 */
export function createFunctionInput(
  functionName: string,
  payload: Record<string, any>,
  eventContext: Record<string, any> = {}
): Record<string, any> {
  // Get credentials from environment variables
  const trelloApiKey = process.env.TRELLO_API_KEY || '';
  const trelloToken = process.env.TRELLO_TOKEN || '';
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID || '';

  if (!trelloApiKey || !trelloToken || !trelloOrgId) {
    throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  }

  return {
    context: {
      dev_oid: 'dev_oid_test',
      source_id: 'source_id_test',
      snap_in_id: 'snap_in_id_test',
      snap_in_version_id: 'snap_in_version_id_test',
      service_account_id: 'service_account_id_test',
      secrets: {
        service_account_token: 'service_account_token_test',
        actor_session_token: 'actor_session_token_test'
      }
    },
    execution_metadata: {
      request_id: 'request_id_test',
      function_name: functionName,
      event_type: 'event_type_test',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    },
    payload: {
      connection_data: {
        key: `key=${trelloApiKey}&token=${trelloToken}`,
        org_id: trelloOrgId,
        org_name: 'Test Organization',
        key_type: 'api_key'
      },
      event_context: {
        ...eventContext
      },
      ...payload
    }
  };
}

/**
 * Sends a request to the snap-in server
 */
export async function callSnapInFunction(
  functionName: string,
  payload: Record<string, any>,
  eventContext: Record<string, any> = {}
): Promise<AxiosResponse> {
  const functionInput = createFunctionInput(functionName, payload, eventContext);

  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, functionInput, {
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'close' // Ensure connection is closed after request
      },
      // Add timeout to prevent hanging connections
      timeout: 10000,
      maxRedirects: 0 // Prevent redirects which can cause hanging connections
    });
    return response;
  } catch (error: unknown) {
    // Properly handle the error based on its type
    if (axios.isAxiosError(error)) {
      console.error('Axios error calling snap-in function:', error.message);
      if (error.response) {
        return error.response;
      }
    } else {
      console.error('Error calling snap-in function:', error instanceof Error ? error.message : String(error));
    }
    
    throw error; // Re-throw the error to be handled by the test
  }
}