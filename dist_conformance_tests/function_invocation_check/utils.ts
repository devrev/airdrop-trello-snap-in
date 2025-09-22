import axios from 'axios';
import { Server } from 'http';
import express from 'express';

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;
export const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Types
export interface Context {
  dev_oid: string;
  source_id: string;
  snap_in_id: string;
  snap_in_version_id: string;
  service_account_id: string;
  secrets: Record<string, string>;
}

export interface ExecutionMetadata {
  request_id: string;
  function_name: string;
  event_type: string;
  devrev_endpoint: string;
}

export interface InputData {
  global_values: Record<string, string>;
  event_sources: Record<string, string>;
}

export interface FunctionInput {
  payload: Record<string, any>;
  context: Context;
  execution_metadata: ExecutionMetadata;
  input_data: InputData;
}

export interface FunctionResponse {
  function_result: {
    can_be_invoked: boolean;
    message: string;
  };
  error?: any;
}

// Helper to create a valid event for testing
export function createValidEvent(): FunctionInput {
  return {
    payload: {
      event_type: 'test_event',
      connection_data: {
        org_id: 'test-org-123',
        org_name: 'Test Organization',
        key: 'test-key',
        key_type: 'api'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        dev_org: 'don-1234',
        dev_org_id: 'don-1234',
        dev_user: 'devu-1234',
        dev_user_id: 'devu-1234',
        external_sync_unit: 'esu-1234',
        external_sync_unit_id: 'esu-1234',
        external_sync_unit_name: 'Test Sync Unit',
        external_system: 'test-system',
        external_system_type: 'test-type',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: 'req-1234',
        snap_in_slug: 'test-snap-in',
        snap_in_version_id: 'snap-ver-1234',
        sync_run: 'sync-1234',
        sync_run_id: 'sync-1234',
        sync_tier: 'test-tier',
        sync_unit: 'su-1234',
        sync_unit_id: 'su-1234',
        uuid: 'uuid-1234',
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_data: {}
    },
    context: {
      dev_oid: 'don-1234',
      source_id: 'src-1234',
      snap_in_id: 'snap-1234',
      snap_in_version_id: 'snap-ver-1234',
      service_account_id: 'svc-1234',
      secrets: {
        service_account_token: 'test-token-123',
        actor_session_token: 'actor-token-123'
      }
    },
    execution_metadata: {
      request_id: 'req-1234',
      function_name: 'check_invocation',
      event_type: 'test_event',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Helper to create a minimal valid event
export function createMinimalEvent(): FunctionInput {
  return {
    payload: {
      event_type: 'test_event'
    },
    context: {
      dev_oid: 'don-1234',
      source_id: 'src-1234',
      snap_in_id: 'snap-1234',
      snap_in_version_id: 'snap-ver-1234',
      service_account_id: 'svc-1234',
      secrets: {
        service_account_token: 'test-token-123'
      }
    },
    execution_metadata: {
      request_id: 'req-1234',
      function_name: 'check_invocation',
      event_type: 'test_event',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Helper to create an invalid event (missing required fields)
export function createInvalidEvent(): Partial<FunctionInput> {
  return {
    payload: {
      event_type: 'test_event'
    },
    // Missing context and execution_metadata
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Helper to invoke the function
export async function invokeFunction(event: any): Promise<FunctionResponse> {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Function invocation failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

// Setup a callback server for testing
export function setupCallbackServer(): Server {
  const app = express();
  app.use(express.json());
  
  let lastCallback: any = null;
  
  app.post('/callback', (req, res) => {
    lastCallback = req.body;
    res.status(200).send({ status: 'ok' });
  });
  
  app.get('/last-callback', (req, res) => {
    res.status(200).send(lastCallback);
  });
  
  return app.listen(CALLBACK_SERVER_PORT, () => {
    console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
  });
}