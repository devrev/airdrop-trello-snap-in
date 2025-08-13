import axios from 'axios';
import express from 'express';
import http from 'http';

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;

// Environment variables
export const TRELLO_API_KEY = process.env.TRELLO_API_KEY || '';
export const TRELLO_TOKEN = process.env.TRELLO_TOKEN || '';
export const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID || '';

// Check if environment variables are set
if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
  console.error('Required environment variables are not set. Please set TRELLO_API_KEY, TRELLO_TOKEN, and TRELLO_ORGANIZATION_ID.');
  process.exit(1);
}

// Create a function to generate a unique request ID
export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Create a function to build the event payload
export function buildExtractionEvent(eventType: string): any {
  return {
    payload: {
      connection_data: {
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
        org_id: TRELLO_ORGANIZATION_ID,
        org_name: 'Test Organization',
        key_type: 'api_key'
      },
      event_context: {
        callback_url: `http://localhost:${CALLBACK_SERVER_PORT}/callback`,
        dev_org: 'dev_org_123',
        dev_org_id: 'dev_org_123',
        dev_user: 'dev_user_123',
        dev_user_id: 'dev_user_123',
        external_sync_unit: 'board_123',
        external_sync_unit_id: '6752eb962a64828e59a35396',
        external_sync_unit_name: 'Test Board',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'import_123',
        mode: 'INITIAL',
        request_id: generateRequestId(),
        snap_in_slug: 'trello-snap-in',
        snap_in_version_id: 'snap_in_version_123',
        sync_run: 'sync_run_123',
        sync_run_id: 'sync_run_123',
        sync_tier: 'tier_1',
        sync_unit: 'sync_unit_123',
        sync_unit_id: 'sync_unit_123',
        uuid: generateRequestId(),
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_type: eventType,
      event_data: {}
    },
    context: {
      dev_oid: 'dev_oid_123',
      source_id: 'source_123',
      snap_in_id: 'snap_in_123',
      snap_in_version_id: 'snap_in_version_123',
      service_account_id: 'service_account_123',
      secrets: {
        service_account_token: 'service_account_token_123'
      }
    },
    execution_metadata: {
      request_id: generateRequestId(),
      function_name: 'extraction',
      event_type: eventType,
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Create a function to send a request to the snap-in server
export async function callSnapInServer(event: any): Promise<any> {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Snap-in server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

// Create a callback server to receive responses
export function createCallbackServer(): Promise<{ server: http.Server, getLastCallback: () => any }> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());
    
    let lastCallback: any = null;
    
    app.post('/callback', (req, res) => {
      lastCallback = req.body;
      res.status(200).send({ status: 'ok' });
    });
    
    const server = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
      resolve({
        server,
        getLastCallback: () => lastCallback
      });
    });
  });
}