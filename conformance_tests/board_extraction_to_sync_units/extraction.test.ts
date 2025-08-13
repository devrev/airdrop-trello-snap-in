import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import bodyParser from 'body-parser';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Environment variables check
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;
const BOARD_ID = '6752eb962a64828e59a35396'; // Test board ID as specified in requirements

// Setup callback server
let callbackServer: Server;
let callbackData: any = null;
let callbackPromiseResolve: ((value: any) => void) | null = null;

// Create a promise that will be resolved when the callback is received
const createCallbackPromise = () => {
  return new Promise<any>((resolve) => {
    callbackPromiseResolve = resolve;
  });
};

let callbackPromise = createCallbackPromise();

beforeAll(async () => {
  // Verify environment variables
  expect(TRELLO_API_KEY).toBeDefined();
  expect(TRELLO_TOKEN).toBeDefined();
  expect(TRELLO_ORGANIZATION_ID).toBeDefined();

  // Setup callback server
  const app = express();
  app.use(bodyParser.json());
  
  app.post('/callback', (req, res) => {
    callbackData = req.body;
    if (callbackPromiseResolve) {
      callbackPromiseResolve(req.body);
    }
    res.status(200).send({ status: 'ok' });
  });
  
  callbackServer = app.listen(CALLBACK_SERVER_PORT);
});

afterAll(async () => {
  // Cleanup callback server
  if (callbackServer) {
    await new Promise<void>((resolve) => {
      callbackServer.close(() => resolve());
    });
  }
});

beforeEach(() => {
  // Reset callback data before each test
  callbackData = null;
  callbackPromise = createCallbackPromise();
});

describe('Trello Airdrop Snap-In Extraction Function Tests', () => {
  // Test 1: Environment variables check
  test('Environment variables are properly set', () => {
    expect(TRELLO_API_KEY).toBeTruthy();
    expect(TRELLO_TOKEN).toBeTruthy();
    expect(TRELLO_ORGANIZATION_ID).toBeTruthy();
  });

  // Test 2: Simple function invocation
  test('Extraction function can be invoked', async () => {
    const payload = createBasicPayload('EXTRACTION_DATA_START');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, payload);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });

  // Test 3: External sync units extraction
  test('Extraction function processes EXTRACTION_EXTERNAL_SYNC_UNITS_START event', async () => {
    const payload = createBasicPayload('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, payload);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
  });

  // Test 4: Field mapping validation
  test('Extraction function correctly maps Trello boards to external sync units', async () => {
    // First, get the boards directly to compare with
    const trelloClient = axios.create({
      baseURL: 'https://api.trello.com/1',
      params: {
        key: TRELLO_API_KEY,
        token: TRELLO_TOKEN
      }
    });
    
    const boardsResponse = await trelloClient.get('/members/me/boards');
    const boards = boardsResponse.data;
    
    // Now invoke the extraction function
    const payload = createBasicPayload('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    // Set up a callback URL to receive the emitted event
    payload.payload.event_context.callback_url = `${CALLBACK_SERVER_URL}/callback`;
    
    // Send the request to the snap-in
    await axios.post(SNAP_IN_SERVER_URL, payload);
    
    // Wait for the callback with a timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Callback timeout')), 30000)
    );
    
    const receivedData = await Promise.race([callbackPromise, timeoutPromise]);
    
    expect(receivedData).toBeDefined();
    expect(receivedData.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    expect(receivedData.event_data).toBeDefined();
    expect(receivedData.event_data.external_sync_units).toBeDefined();
    
    const externalSyncUnits = receivedData.event_data.external_sync_units;
    expect(externalSyncUnits.length).toBeGreaterThan(0);
    
    // Verify the mapping for at least one board
    const syncUnit = externalSyncUnits[0];
    const board = boards.find((b: any) => b.id === syncUnit.id);
    expect(board).toBeDefined();
    
    // Check field mappings
    expect(syncUnit.id).toBe(board.id);
    expect(syncUnit.name).toBe(board.name);
    expect(syncUnit.description).toBe(board.desc || '');
    expect(syncUnit.item_type).toBe('tasks');
  });
});

// Helper function to create a basic payload
function createBasicPayload(eventType: string) {
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
      request_id: 'test-request-id',
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
        external_sync_unit_id: BOARD_ID,
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-dev-user',
        dev_user_id: 'test-dev-user-id',
        external_sync_unit: 'test-external-sync-unit',
        external_sync_unit_name: 'test-external-sync-unit-name',
        external_system: 'trello',
        external_system_type: 'trello',
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
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_type: eventType,
      event_data: {}
    }
  };
}