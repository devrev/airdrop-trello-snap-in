import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const TEST_BOARD_ID = '688725dad59c015ce052eecf';
const TEST_CARD_ID = '688725fdf26b3c50430cae23';

// Environment variables
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
  throw new Error('Required environment variables are missing. Please set TRELLO_API_KEY, TRELLO_TOKEN, and TRELLO_ORGANIZATION_ID');
}

// Setup callback server
let callbackServer: Server;
let lastReceivedCallback: any = null;

function setupCallbackServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = express();
    app.use(bodyParser.json());
    
    app.post('*', (req, res) => {
      lastReceivedCallback = req.body;
      res.status(200).send();
    });
    
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
      resolve();
    });
  });
}

function shutdownCallbackServer(): Promise<void> {
  return new Promise((resolve) => {
    if (callbackServer) {
      callbackServer.close(() => {
        console.log('Callback server shut down');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Helper function to create event payload
function createEventPayload(eventType: string) {
  return {
    payload: {
      event_type: eventType,
      event_context: {
        callback_url: `http://localhost:${CALLBACK_SERVER_PORT}/callback`,
        dev_org_id: 'test-org-id',
        dev_user_id: 'test-user-id',
        external_sync_unit_name: 'Test Board',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: 'test-request-id',
        snap_in_slug: 'trello',
        external_sync_unit_id: TEST_BOARD_ID,
        snap_in_version_id: 'test-version-id',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'test-tier',
        sync_unit_id: 'test-sync-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      connection_data: {
        org_id: TRELLO_ORGANIZATION_ID,
        org_name: 'Test Organization',
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
        key_type: 'api_key'
      },
      event_data: {
        // For attachment extraction, we need to provide card ID
        card_id: TEST_CARD_ID
      }
    },
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token'
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
    }
  };
}

describe('Attachment Extraction Tests', () => {
  beforeAll(async () => {
    await setupCallbackServer();
  });

  afterAll(async () => {
    await shutdownCallbackServer();
  });

  beforeEach(() => {
    lastReceivedCallback = null;
  });

  test('Should handle EXTRACTION_ATTACHMENTS_START event correctly', async () => {
    // Create event payload for EXTRACTION_ATTACHMENTS_START
    const payload = createEventPayload('EXTRACTION_ATTACHMENTS_START');
    
    // Send request to snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, payload);
    
    // Verify response structure
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    
    // Wait for callback (up to 5 seconds)
    let attempts = 0;
    while (!lastReceivedCallback && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    // Verify callback
    expect(lastReceivedCallback).toBeDefined();
    expect(lastReceivedCallback.event_type).toBe('EXTRACTION_ATTACHMENTS_DONE');
  }, 30000);

  test('Should handle EXTRACTION_ATTACHMENTS_CONTINUE event correctly', async () => {
    // Create event payload for EXTRACTION_ATTACHMENTS_CONTINUE
    const payload = createEventPayload('EXTRACTION_ATTACHMENTS_CONTINUE');
    
    // Send request to snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, payload);
    
    // Verify response structure
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    
    // Wait for callback (up to 5 seconds)
    let attempts = 0;
    while (!lastReceivedCallback && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    // Verify callback
    expect(lastReceivedCallback).toBeDefined();
    expect(lastReceivedCallback.event_type).toBe('EXTRACTION_ATTACHMENTS_DONE');
  }, 30000);

  test('Should handle attachment streaming correctly', async () => {
    // Create event payload for EXTRACTION_ATTACHMENTS_START
    const payload = createEventPayload('EXTRACTION_ATTACHMENTS_START');
    
    // Send request to snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, payload);
    
    // Verify response structure
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    
    // Wait for callback (up to 5 seconds)
    let attempts = 0;
    while (!lastReceivedCallback && attempts < 100) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    // Verify callback
    expect(lastReceivedCallback).toBeDefined();
    expect(lastReceivedCallback.event_type).toBe('EXTRACTION_ATTACHMENTS_DONE');
    
    // The implementation should have successfully streamed the attachments
    // We can't directly verify the streaming, but we can check that the process completed
  }, 30000);
});