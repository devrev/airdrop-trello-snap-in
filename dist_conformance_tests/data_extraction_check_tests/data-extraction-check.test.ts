import axios from 'axios';
import express from 'express';
import { Server } from 'http';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Types
interface EventContext {
  callback_url: string;
  [key: string]: any;
}

interface AirdropEvent {
  context: {
    secrets: {
      service_account_token: string;
    };
    snap_in_version_id: string;
    [key: string]: any;
  };
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
  execution_metadata: {
    devrev_endpoint: string;
    function_name: string;
    [key: string]: any;
  };
  input_data: any;
}

// Setup callback server to receive emitted events
let callbackServer: Server;
let receivedEvents: any[] = [];

beforeAll(async () => {
  // Setup callback server
  const app = express();
  app.use(express.json());
  
  app.post('/callback', (req, res) => {
    receivedEvents.push(req.body);
    res.status(200).send({ success: true });
  });
  
  return new Promise<void>((resolve) => {
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server running at ${CALLBACK_SERVER_URL}`);
      resolve();
    });
  });
});

afterAll(async () => {
  // Shutdown callback server
  return new Promise<void>((resolve) => {
    callbackServer.close(() => {
      console.log('Callback server closed');
      resolve();
    });
  });
});

beforeEach(() => {
  // Clear received events before each test
  receivedEvents = [];
});

describe('Data Extraction Check Function Tests', () => {
  // Test 1: Basic Invocation Test
  test('should successfully invoke the data extraction check function', async () => {
    // Create a valid event for data extraction
    const event = createValidEvent('EXTRACTION_DATA_START');
    
    // Send the event to the snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toContain('Data extraction check initiated successfully');
  });

  // Test 2: Event Type Validation Test
  test('should reject invalid event types', async () => {
    // Create an event with an invalid event type
    const event = createValidEvent('INVALID_EVENT_TYPE');
    
    // Send the event to the snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    // Verify the response indicates failure due to invalid event type
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('Unexpected event type');
  });

  // Test 3: Data Processing and Event Emission Test
  test('should process data and emit EXTRACTION_DATA_DONE event', async () => {
    // Create a valid event for data extraction
    const event = createValidEvent('EXTRACTION_DATA_START');
    
    // Send the event to the snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result.success).toBe(true);
    
    // Wait for the callback to be received (the worker emits the event)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we received the EXTRACTION_DATA_DONE event
    const doneEvent = receivedEvents.find(e => 
      e.event_type === 'EXTRACTION_DATA_DONE'
    );
    
    expect(doneEvent).toBeDefined();
  });

  // Test 4: Verify EXTRACTION_DATA_CONTINUE is handled correctly
  test('should handle EXTRACTION_DATA_CONTINUE event correctly', async () => {
    // Create a valid event for data extraction continuation
    const event = createValidEvent('EXTRACTION_DATA_CONTINUE');
    
    // Send the event to the snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result.success).toBe(true);
    
    // Wait for the callback to be received
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we received the EXTRACTION_DATA_DONE event
    const doneEvent = receivedEvents.find(e => 
      e.event_type === 'EXTRACTION_DATA_DONE'
    );
    
    expect(doneEvent).toBeDefined();
  });
});

// Helper function to create a valid event
function createValidEvent(eventType: string): AirdropEvent {
  return {
    context: {
      secrets: {
        service_account_token: 'test-token'
      },
      snap_in_version_id: 'test-version-id',
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      service_account_id: 'test-service-account-id'
    },
    payload: {
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'test-org-name',
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
        external_sync_unit_name: 'test-external-sync-unit-name',
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
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_type: eventType
    },
    execution_metadata: {
      devrev_endpoint: 'http://localhost:8003',
      function_name: 'data_extraction_check',
      request_id: 'test-request-id',
      event_type: 'test-event-type'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}