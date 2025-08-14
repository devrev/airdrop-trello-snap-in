import axios from 'axios';
import express from 'express';
import { Server } from 'http';

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;
export const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Types
export interface EventContext {
  callback_url: string;
  dev_org: string;
  dev_org_id: string;
  dev_user: string;
  dev_user_id: string;
  external_sync_unit: string;
  external_sync_unit_id: string;
  external_sync_unit_name: string;
  external_system: string;
  external_system_type: string;
  import_slug: string;
  mode: string;
  request_id: string;
  snap_in_slug: string;
  snap_in_version_id: string;
  sync_run: string;
  sync_run_id: string;
  sync_tier: string;
  sync_unit: string;
  sync_unit_id: string;
  uuid: string;
  worker_data_url: string;
}

export interface FunctionEvent {
  payload: {
    connection_data: {
      org_id: string;
      org_name: string;
      key: string;
      key_type: string;
    };
    event_context: EventContext;
    event_type: string;
    event_data?: any;
  };
  context: {
    dev_oid: string;
    source_id: string;
    snap_in_id: string;
    snap_in_version_id: string;
    service_account_id: string;
    secrets: {
      service_account_token: string;
      actor_session_token?: string;
    };
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

// Create a test event with the specified function name and event type
export function createTestEvent(functionName: string, eventType: string): FunctionEvent {
  // Get credentials from environment
  const trelloApiKey = process.env.TRELLO_API_KEY || '';
  const trelloToken = process.env.TRELLO_TOKEN || '';
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID || '';
  
  if (!trelloApiKey || !trelloToken || !trelloOrgId) {
    throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  }

  return {
    payload: {
      connection_data: {
        org_id: trelloOrgId,
        org_name: 'Test Organization',
        key: `key=${trelloApiKey}&token=${trelloToken}`,
        key_type: 'api_key'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        dev_org: 'dev_org_123',
        dev_org_id: 'dev_org_123',
        dev_user: 'dev_user_123',
        dev_user_id: 'dev_user_123',
        external_sync_unit: 'board_123',
        external_sync_unit_id: '688725dad59c015ce052eecf',
        external_sync_unit_name: 'Test Board',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: 'req_123',
        snap_in_slug: 'trello-airdrop',
        snap_in_version_id: 'snap_ver_123',
        sync_run: 'sync_run_123',
        sync_run_id: 'sync_run_123',
        sync_tier: 'tier_1',
        sync_unit: 'sync_unit_123',
        sync_unit_id: 'sync_unit_123',
        uuid: 'uuid_123',
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_type: eventType
    },
    context: {
      dev_oid: 'dev_org_123',
      source_id: 'source_123',
      snap_in_id: 'snap_in_123',
      snap_in_version_id: 'snap_ver_123',
      service_account_id: 'service_acc_123',
      secrets: {
        service_account_token: 'test_token'
      }
    },
    execution_metadata: {
      request_id: 'req_123',
      function_name: functionName,
      event_type: 'event_123',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Start a callback server to receive responses
export function startCallbackServer(): Promise<{ server: Server; receivedData: any[] }> {
  const app = express();
  app.use(express.json());
  
  const receivedData: any[] = [];
  
  app.post('/callback', (req, res) => {
    receivedData.push(req.body);
    res.status(200).send('OK');
  });
  
  return new Promise((resolve) => {
    const server = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server started on port ${CALLBACK_SERVER_PORT}`);
      resolve({ server, receivedData });
    });
  });
}

// Send a request to the snap-in server
export async function sendToSnapInServer(event: FunctionEvent): Promise<any> {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, event, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // Add a 10-second timeout
    });
    return response.data;
  } catch (error) {
    console.error('Error sending request to snap-in server:', error);
    throw error;
  }
}

// Add a fail function for Jest tests
export function fail(message: string): never {
  // This will cause the test to fail with the given message
  expect(message).toBe(false);
  throw new Error(message); // This line will never execute but satisfies TypeScript
}