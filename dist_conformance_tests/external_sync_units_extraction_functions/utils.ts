import express from 'express';
import { Server } from 'http';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';

// Load environment variables
dotenv.config();

// Required environment variables
export const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
export const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
export const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

// Test constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;
export const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
export const WORKER_DATA_URL = 'http://localhost:8003/external-worker';
export const TEST_BOARD_ID = '688725dad59c015ce052eecf';

// Validate environment variables
if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
  throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
}

// Create base event payload
export function createBaseEventPayload(eventType: string) {
  return {
    payload: {
      event_type: eventType,
      connection_data: {
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
        org_id: TRELLO_ORGANIZATION_ID,
        org_name: 'Test Organization'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        external_sync_unit_id: TEST_BOARD_ID,
        request_id: `req-${Date.now()}`,
        uuid: `uuid-${Date.now()}`
      }
    },
    context: {
      dev_oid: 'dev_oid',
      source_id: 'source_id',
      snap_in_id: 'snap_in_id',
      snap_in_version_id: 'snap_in_version_id',
      service_account_id: 'service_account_id',
      secrets: {
        service_account_token: 'service_account_token'
      }
    },
    execution_metadata: {
      request_id: `req-${Date.now()}`,
      function_name: 'extraction',
      event_type: 'event_type',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Global variables for callback server
let callbackServer: Server | null = null;
const receivedCallbacks: any[] = [];

// Setup callback server - returns the existing server if already running
export async function setupCallbackServer(): Promise<{ server: Server; receivedCallbacks: any[]; clearCallbacks: () => void }> {
  // If server is already running, return it
  if (callbackServer) {
    return Promise.resolve({ 
      server: callbackServer, 
      receivedCallbacks, 
      clearCallbacks: () => { receivedCallbacks.length = 0; } 
    });
  }

  const app = express();
  app.use(bodyParser.json());
  
  app.post('/callback', (req, res) => {
    // Set a timeout to ensure the response is sent even if processing takes time
    // Log the callback for debugging
    console.log('Received callback:', JSON.stringify(req.body, null, 2));
    receivedCallbacks.push(req.body);
    res.status(200).send();
  });
  
  // Create a promise that resolves when the server is listening
  return new Promise<{ server: Server; receivedCallbacks: any[]; clearCallbacks: () => void }>((resolve) => {
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
      resolve({
        server: callbackServer as Server,
        receivedCallbacks,
        clearCallbacks: () => { receivedCallbacks.length = 0; }
      });
    });
  });
}
  
// Shutdown callback server
export function shutdownCallbackServer() {
  if (callbackServer) {
    // Ensure all connections are closed
    console.log('Shutting down callback server');
    callbackServer.close();
    callbackServer = null;
  }
}