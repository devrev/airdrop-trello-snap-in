import axios from 'axios';

export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_URL = 'http://localhost:8002/callback';

export interface FunctionInput {
  payload: Record<string, any>;
  context: {
    dev_oid: string;
    source_id: string;
    snap_in_id: string;
    snap_in_version_id: string;
    service_account_id: string;
    secrets: Record<string, string>;
  };
  execution_metadata: {
    request_id: string;
    function_name: string;
    event_type: string;
    devrev_endpoint: string;
  };
  input_data: {
    global_values: Record<string, string>;
    event_sources: Record<string, string>;
  };
}

export async function callSnapInFunction(
  functionName: string, 
  payload: Record<string, any> = {}
): Promise<any> {
  const functionInput: FunctionInput = {
    payload: {
      ...payload,
      connection_data: {
        key: `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`,
        org_id: process.env.TRELLO_ORGANIZATION_ID || '',
        org_name: 'Test Organization'
      }
    },
    context: {
      dev_oid: 'dev_oid_test',
      source_id: 'source_id_test',
      snap_in_id: 'snap_in_id_test',
      snap_in_version_id: 'snap_in_version_id_test',
      service_account_id: 'service_account_id_test',
      secrets: {
        service_account_token: 'test_token'
      }
    },
    execution_metadata: {
      request_id: `req_${Date.now()}`,
      function_name: functionName,
      event_type: 'test_event',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  try {
    // Add timeout to prevent hanging connections
    const response = await axios.post(SNAP_IN_SERVER_URL, functionInput, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    // Check if the response is wrapped in a function_result object
    if (response.data && typeof response.data === 'object' && 'function_result' in response.data) {
      // Extract the actual function result
      return response.data.function_result;
    }

    // If the response is not wrapped, return it as is
    // This provides backward compatibility if the server response format changes
    // or for different function responses

    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(`Server error response: ${JSON.stringify(error.response.data)}`);
      throw new Error(`Snap-In server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      throw new Error(`No response received from Snap-In server: ${error.message}`);
    } else {
      // Something happened in setting up the request
      console.error(`Error setting up request: ${error.message}`);
      throw error;
    }
  }
}

export function validateEnvironmentVariables(): void {
  const requiredVars = ['TRELLO_API_KEY', 'TRELLO_TOKEN', 'TRELLO_ORGANIZATION_ID'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}