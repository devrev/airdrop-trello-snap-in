import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { EventType, ExtractorEventType } from '@devrev/ts-adaas';

// Test configuration
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Setup callback server to receive events from the snap-in
const app = express();
app.use(bodyParser.json());

let receivedCallbacks: any[] = [];

// Endpoint to receive callbacks from the snap-in
app.post('/callback', (req, res) => {
  receivedCallbacks.push(req.body);
  res.status(200).send('OK');
});

// Start the callback server
const server = app.listen(CALLBACK_SERVER_PORT, () => {
  console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
});

// Cleanup function to close server after tests
afterAll((done) => {
  server.close(done);
});

// Clear received callbacks before each test
beforeEach(() => {
  receivedCallbacks = [];
});

describe('External Sync Units Extraction Tests', () => {
  // Test 1: Basic invocation test
  test('should successfully invoke the test_external_sync_units function', async () => {
    // Create the event payload
    const event = createExtractionStartEvent();
    
    // Send the event to the snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toContain('External sync units extraction test initiated successfully');
  }, 10000);

  // Test 2: Response structure test
  test('should return a properly structured response', async () => {
    // Create the event payload
    const event = createExtractionStartEvent();
    
    // Send the event to the snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    // Verify the response structure
    expect(response.data.function_result).toMatchObject({
      success: true,
      message: expect.stringContaining('External sync units extraction test initiated successfully')
    });
    expect(response.data.error).toBeUndefined();
  }, 10000);

  // Test 3: Callback test with timeout
  test('should emit EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event', async () => {
    // Create the event payload with callback URL
    const event = createExtractionStartEvent(`${CALLBACK_SERVER_URL}/callback`);
    
    // Send the event to the snap-in server
    await axios.post(SNAP_IN_SERVER_URL, event);
    
    // Wait for the callback to be received (with timeout)
    await waitForCallback(5000);
    
    // Verify that we received at least one callback
    expect(receivedCallbacks.length).toBeGreaterThan(0);
    
    // Find the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event
    const doneEvent = receivedCallbacks.find(
      callback => callback.event_type === ExtractorEventType.ExtractionExternalSyncUnitsDone
    );
    
    // Verify the event was emitted
    expect(doneEvent).toBeDefined();
  }, 10000);

  // Test 4: External sync units data test
  test('should emit external sync units data in the DONE event', async () => {
    // Create the event payload with callback URL
    const event = createExtractionStartEvent(`${CALLBACK_SERVER_URL}/callback`);
    
    // Send the event to the snap-in server
    await axios.post(SNAP_IN_SERVER_URL, event);
    
    // Wait for the callback to be received
    await waitForCallback(5000);
    
    // Find the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event
    const doneEvent = receivedCallbacks.find(
      callback => callback.event_type === ExtractorEventType.ExtractionExternalSyncUnitsDone
    );
    
    // Verify the event contains external sync units
    expect(doneEvent).toBeDefined();
    expect(doneEvent.event_data).toBeDefined();
    expect(doneEvent.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(doneEvent.event_data.external_sync_units)).toBe(true);
    expect(doneEvent.event_data.external_sync_units.length).toBeGreaterThan(0);
    
    // Verify the structure of the external sync units
    const firstUnit = doneEvent.event_data.external_sync_units[0];
    expect(firstUnit).toHaveProperty('id');
    expect(firstUnit).toHaveProperty('name');
    expect(firstUnit).toHaveProperty('description');
    expect(firstUnit).toHaveProperty('item_count');
  }, 10000);
});

// Helper function to create an extraction start event
function createExtractionStartEvent(callbackUrl = 'http://localhost:8002/callback') {
  return {
    payload: {
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'Test Organization',
        key: 'test-key',
        key_type: 'test-key-type'
      },
      event_context: {
        callback_url: callbackUrl,
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
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_type: EventType.ExtractionExternalSyncUnitsStart,
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
      function_name: 'test_external_sync_units',
      event_type: 'test-event-type',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Helper function to wait for a callback with timeout
async function waitForCallback(timeout: number): Promise<void> {
  const startTime = Date.now();
  
  while (receivedCallbacks.length === 0) {
    // Check if timeout has been reached
    if (Date.now() - startTime > timeout) {
      throw new Error(`Timed out waiting for callback after ${timeout}ms`);
    }
    
    // Wait a short time before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}