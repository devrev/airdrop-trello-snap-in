import axios from 'axios';
import express from 'express';
import { Server } from 'http';

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;
export const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Types
export interface HealthCheckResponse {
  function_result: {
    status: string;
    message: string;
  };
  error?: any;
}

export interface ErrorResponse {
  error: {
    err_msg?: string;
    err_type?: string;
  };
}

export type FunctionInput = {
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

// Helper function to create a valid function input event
export function createValidFunctionInput(functionName: string = 'health_check'): FunctionInput {
  return {
    payload: {
      // Need at least one property to pass server validation
      test_property: "test_value"
      // Empty payload for health check
    },
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
      event_type: 'test-event',
      devrev_endpoint: 'https://api.devrev.ai'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Helper function to create invalid function inputs for testing error cases
export function createInvalidFunctionInput(missingProperty: 'context' | 'execution_metadata'): any {
  const baseInput = {
    payload: {
      test_property: "test_value"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  if (missingProperty === 'context') {
    return {
      ...baseInput,
      execution_metadata: {
        request_id: 'test-request-id',
        function_name: 'health_check',
        event_type: 'test-event',
        devrev_endpoint: 'https://api.devrev.ai'
      }
    };
  } else if (missingProperty === 'execution_metadata') {
    return {
      ...baseInput,
      context: {
        dev_oid: 'test-dev-oid',
        source_id: 'test-source-id',
        snap_in_id: 'test-snap-in-id',
        snap_in_version_id: 'test-snap-in-version-id',
        service_account_id: 'test-service-account-id',
        secrets: {
          service_account_token: 'test-token'
        }
      }
    };
  }
}

// Helper function to invoke a function on the snap-in server
export async function invokeFunctionOnServer(functionInput: FunctionInput): Promise<HealthCheckResponse | ErrorResponse> {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, functionInput, {
      validateStatus: (status) => true, // Accept all status codes to handle them in our code
      timeout: 5000, // Add timeout to prevent hanging connections
    });
    
    // For 400 errors, format the response to match our expected error format
    if (response.status === 400) {
      return {
        error: { 
          err_msg: response.data 
        }
      };
    }
    
    return response.data;
  } catch (error) {
      // Type guard for axios error
      if (axios.isAxiosError(error) && error.response && error.response.status === 400) {
        return {
          error: { err_msg: error.response.data }
        };
      }
      // Handle generic errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Network error invoking function: ${errorMessage}`);
    }
}

// Helper to start a callback server for testing
export function startCallbackServer(): Promise<{ server: Server; app: express.Express }> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());
    
    const server = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server started on port ${CALLBACK_SERVER_PORT}`);
      resolve({ server, app });
    });
  });
}