import axios from 'axios';
import express from 'express';
import { Server } from 'http';

// Constants for server URLs
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;
export const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
export const DEVREV_SERVER_URL = 'http://localhost:8003';
export const WORKER_DATA_SERVER_URL = `${DEVREV_SERVER_URL}/external-worker`;

// Type definitions for the function input
export type Context = {
  dev_oid: string;
  source_id: string;
  snap_in_id: string;
  snap_in_version_id: string;
  service_account_id: string;
  secrets: Record<string, string>;
};

export type ExecutionMetadata = {
  request_id: string;
  function_name: string;
  event_type: string;
  devrev_endpoint: string;
};

export type InputData = {
  global_values: Record<string, string>;
  event_sources: Record<string, string>;
};

export type FunctionInput = {
  payload: Record<string, any>;
  context: Context;
  execution_metadata: ExecutionMetadata;
  input_data: InputData;
};

// Create a basic function input for testing
export function createBasicFunctionInput(functionName: string = 'health_check'): FunctionInput {
  return {
    payload: {
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'Test Organization',
        key: 'test-key',
        key_type: 'test-key-type'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-dev-user',
        dev_user_id: 'test-dev-user-id',
        external_sync_unit: 'test-external-sync-unit',
        external_sync_unit_id: 'test-external-sync-unit-id',
        external_sync_unit_name: 'Test External Sync Unit',
        external_system: 'test-external-system',
        external_system_type: 'test-external-system-type',
        import_slug: 'test-import-slug',
        mode: 'INITIAL',
        request_id: 'test-request-id',
        snap_in_slug: 'test-snap-in-slug',
        snap_in_version_id: 'test-snap-in-version-id',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'test-sync-tier',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit-id',
        uuid: 'test-uuid',
        worker_data_url: `${WORKER_DATA_SERVER_URL}`
      },
      event_type: 'HEALTH_CHECK',
      event_data: {}
    },
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-service-account-token'
      }
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: functionName,
      event_type: 'HEALTH_CHECK',
      devrev_endpoint: DEVREV_SERVER_URL
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Function to send a request to the snap-in server
export async function sendRequestToSnapInServer(input: FunctionInput): Promise<any> {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, input, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error sending request to snap-in server:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

// Setup a callback server to receive responses
export function setupCallbackServer(): Promise<{ server: Server; callbackData: any[] }> {
  const app = express();
  app.use(express.json());
  
  const callbackData: any[] = [];
  
  app.post('/callback', (req, res) => {
    console.log('Received callback:', req.body);
    callbackData.push(req.body);
    res.status(200).send({ status: 'success' });
  });
  
  return new Promise((resolve) => {
    const server = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
      resolve({ server, callbackData });
    });
  });
}

// Close the callback server
export function closeCallbackServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}