import axios from 'axios';
import express from 'express';
import { Request, Response } from 'express';
import bodyParser from 'body-parser';

// Server URLs
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_URL = 'http://localhost:8002';
export const DEVREV_SERVER_URL = 'http://localhost:8003';

// Environment variables
export const TRELLO_API_KEY = process.env.TRELLO_API_KEY || '';
export const TRELLO_TOKEN = process.env.TRELLO_TOKEN || '';
export const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID || '';

// Test board and card IDs
export const TEST_BOARD_ID = '688725dad59c015ce052eecf';
export const TEST_CARD_ID = '688725fdf26b3c50430cae23';

export const WORKER_DATA_URL = `${DEVREV_SERVER_URL}/external-worker`;

// Function to create a basic event structure
export function createEvent(functionName: string, eventType: string, payload: any = {}) {
  return {
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
      request_id: `req_${Date.now()}`,
      function_name: functionName,
      event_type: eventType,
      devrev_endpoint: DEVREV_SERVER_URL
    },
    input_data: {
      global_values: {},
      event_sources: {}
    },
    payload: payload
  };
}

// Function to create an extraction data start event
export function createExtractionDataStartEvent(
  isIncremental: boolean = false,
  lastSuccessfulSyncStarted?: string
) {
  const mode = isIncremental ? 'INCREMENTAL' : 'INITIAL';
  
  return createEvent('extraction', 'extraction_data_start', {
    event_type: 'EXTRACTION_DATA_START',
    event_data: lastSuccessfulSyncStarted ? {
      lastSuccessfulSyncStarted: lastSuccessfulSyncStarted
    } : {},
    connection_data: {
      org_id: TRELLO_ORGANIZATION_ID,
      key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`
    },
    event_context: {
      mode: mode,
      external_sync_unit_id: TEST_BOARD_ID,
      callback_url: `${CALLBACK_SERVER_URL}/callback`,
      worker_data_url: WORKER_DATA_URL,
      dev_org: 'dev_org_id',
      dev_org_id: 'dev_org_id',
      dev_user: 'dev_user_id',
      dev_user_id: 'dev_user_id',
      sync_run: 'sync_run_id',
      sync_run_id: 'sync_run_id',
      uuid: `test-uuid-${Date.now()}`,
      sync_unit: 'sync_unit_id',
      sync_unit_id: 'sync_unit_id',
      external_system: 'trello',
      external_system_type: 'trello',
      snap_in_slug: 'trello-snapin',
      sync_tier: 'test',
      import_slug: 'test-import',
      external_sync_unit_name: 'Test Board'
    },
  });
}

// Function to send an event to the snap-in server
export async function sendEventToSnapIn(event: any) {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    // Add a small delay to allow the server to process the request
    await new Promise(resolve => setTimeout(resolve, 1000));
    return response?.data;
  } catch (error) {
    console.error('Error sending event to snap-in:', error);
    throw error;
  }
}

// Create a simple callback server to receive events from the snap-in
let callbackServer: any = null;
let lastReceivedCallback: any = null;
let customCallbackHandler: ((req: Request, res: Response) => void) | null = null;

export function startCallbackServer(customHandler?: (req: Request, res: Response) => void) {
  if (callbackServer) return;
  
  const app = express();
  app.use(express.json());
  app.use(bodyParser.json());
  
  // Store the custom handler if provided
  if (customHandler) {
    customCallbackHandler = customHandler;
  }
  
  app.post('/callback', (req, res) => {
    if (customCallbackHandler) {
      // Use custom handler if provided
      customCallbackHandler(req, res);
    } else {
      // Default handler
      console.log('Received callback:', req.body);
      console.log('Callback event data:', JSON.stringify(req.body.event_data, null, 2));
      lastReceivedCallback = req.body;
      res.status(200).send({ status: 'success' });
    }
  });
  
  return new Promise<void>((resolve) => {
    callbackServer = app.listen(8002, () => {
      console.log('Callback server started on port 8002');
      resolve();
    });
  });
}

export function stopCallbackServer() {
  return new Promise<void>((resolve) => {
    if (callbackServer) {
      callbackServer.close(() => {
        callbackServer = null;
        customCallbackHandler = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export function getLastReceivedCallback() {
  return lastReceivedCallback;
}