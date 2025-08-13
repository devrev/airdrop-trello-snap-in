import axios from 'axios';
import express from 'express';
import { Server } from 'http';

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;
export const DEVREV_SERVER_URL = 'http://localhost:8003';
export const WORKER_DATA_URL = `${DEVREV_SERVER_URL}/external-worker`;
export const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Environment variables
export const TRELLO_API_KEY = process.env.TRELLO_API_KEY?.trim() || '';
export const TRELLO_TOKEN = process.env.TRELLO_TOKEN?.trim() || '';
export const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID?.trim() || '';

// Test board ID
export const TEST_BOARD_ID = '6752eb962a64828e59a35396';

// Create a basic event object for testing
export function createTestEvent(eventType: string, additionalPayload = {}) {
  const requestId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
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
      request_id: requestId,
      function_name: 'extraction',
      event_type: 'test-event-type',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    },
    payload: {
      connection_data: {
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
        org_id: TRELLO_ORGANIZATION_ID
      },
      event_context: {
        external_sync_unit_id: TEST_BOARD_ID,
        request_id: requestId,
        callback_url: CALLBACK_SERVER_URL,
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-dev-user',
        dev_user_id: 'test-dev-user-id',
        external_system: 'trello',
        external_system_type: 'trello',
        worker_data_url: WORKER_DATA_URL,
        sync_unit_id: TEST_BOARD_ID,
        sync_run_id: `test-sync-run-${Date.now()}`
      },
      event_type: eventType,
      ...additionalPayload
    }
  };
}

// Send an event to the snap-in server
export async function sendEventToSnapIn(event: any) {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, event, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending event to snap-in:', error instanceof Error ? error.message : error);
    throw error;
  }
}

// Create a simple callback server to receive responses
export function createCallbackServer(): Promise<{ server: Server, receivedData: any[] }> {
  const app = express();
  app.use(express.json());
  
  const receivedData: any[] = [];
  
  app.post('*', (req, res) => {
    receivedData.push(req.body);
    res.status(200).send({ success: true });
  });
  
  return new Promise((resolve) => {
    const server = app.listen(CALLBACK_SERVER_PORT, () => {
      resolve({ server, receivedData });
    });
  });
}