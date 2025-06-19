import axios from 'axios';
import express from 'express';
import { Server } from 'http';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Interface for external sync unit
interface ExternalSyncUnit {
  id: string;
  name: string;
  description: string;
  item_count: number;
  item_type: string;
}

// Setup callback server
function setupCallbackServer(): Promise<{ server: Server; receivedData: any[] }> {
  const app = express();
  app.use(express.json());
  
  const receivedData: any[] = [];
  
  app.post('*', (req, res) => {
    console.log('Callback server received data at path:', req.path);
    console.log('Callback data:', JSON.stringify(req.body, null, 2));
    receivedData.push(req.body);
    res.status(200).json({ success: true });
    console.log('Callback server responded with 200 OK');
  });
  
  return new Promise((resolve) => {
    const server = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server started on port ${CALLBACK_SERVER_PORT}`);
      resolve({ server, receivedData });
    });
  });
}

// Create a basic event payload for testing
function createEventPayload(overrides: Record<string, any> = {}) {
  return {
    execution_metadata: {
      function_name: 'extraction_external_sync_unit_check',
      devrev_endpoint: 'http://localhost:8003',
      event_type: 'extraction:external_sync_units_start'
    },
    context: {
      secrets: {
        service_account_token: 'test-token'
      },
      snap_in_id: 'test-snap-in-id'
    },
    payload: {
      event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
      event_context: overrides.event_context || {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        ...overrides.event_context
      },
      ...overrides.payload
    }
  };
}

// Helper function to invoke the function
async function invokeFunction(payload: any) {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error invoking function:', error);
    throw error;
  }
}

describe('extraction_external_sync_unit_check Conformance Tests', () => {
  let callbackServer: Server;
  let receivedData: any[];

  beforeAll(async () => {
    // Start the callback server
    const setup = await setupCallbackServer();
    callbackServer = setup.server;
    receivedData = setup.receivedData;
  });

  afterAll((done) => {
    // Close the callback server
    if (callbackServer) {
      callbackServer.close(() => {
        console.log('Callback server closed');
        done();
      });
    } else {
      done();
    }
  });

  beforeEach(() => {
    // Clear received data before each test
    receivedData.length = 0;
  });

  test('Basic Invocation - Function should be invokable', async () => {
    const payload = createEventPayload();
    const result = await invokeFunction(payload);
    
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBeDefined();
  });

  test('Error Handling - Missing event context should return error', async () => {
    const payload = createEventPayload();
    delete payload.payload.event_context;
    
    const result = await invokeFunction(payload);
    
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(false);
    expect(result.function_result.message).toContain('Missing event context');
  });

  test('Error Handling - Missing service account token should return error', async () => {
    // Create a payload without service_account_token instead of deleting it
    const payload = {
      ...createEventPayload(),
      context: {
        ...createEventPayload().context,
        secrets: {}
      }
    };
    
    const result = await invokeFunction(payload);
    
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(false);
    expect(result.function_result.message).toContain('Missing service account token');
  });

  test('Callback URL - Function should process external sync units', async () => {
    const payload = createEventPayload();
    
    // Invoke the function
    const result = await invokeFunction(payload);
    
    // Wait for the worker to process and send data to callback
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check the function result
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(true);
    
    // Verify that data was sent to the callback URL
    expect(receivedData.length).toBeGreaterThan(0);
    console.log(`Received ${receivedData.length} callback data items`);
    
    // Log all received data for debugging
    receivedData.forEach((data, index) => {
      console.log(`Data ${index}:`, JSON.stringify(data, null, 2));
    });
    
    // The worker should have sent external sync units to the callback
    const callbackData = receivedData.find(data =>
      data.event_data && data.event_data.external_sync_units && Array.isArray(data.event_data.external_sync_units)
    );
    
    expect(callbackData).toBeDefined();
    expect(callbackData.event_data.external_sync_units).toBeInstanceOf(Array);
    expect(callbackData.event_data.external_sync_units.length).toBeGreaterThan(0);
    
    // Verify the structure of the external sync units
    const syncUnit = callbackData.event_data.external_sync_units[0];
    expect(syncUnit).toBeDefined();
    expect(syncUnit).toHaveProperty('name');
    expect(syncUnit).toHaveProperty('description');
    expect(syncUnit).toHaveProperty('item_count');
    expect(syncUnit).toHaveProperty('item_type');
  });

  test('Complete Workflow - Function should handle the entire extraction workflow', async () => {
    const payload = createEventPayload();
    
    // Invoke the function
    const result = await invokeFunction(payload);
    
    // Wait for the worker to process and send data to callback
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check the function result
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(true);
    expect(result.function_result.message).toContain('External sync units extraction workflow');
    
    // Verify that data was sent to the callback URL
    expect(receivedData.length).toBeGreaterThan(0);
    console.log(`Received ${receivedData.length} callback data items`);
    
    // Find the external sync units done event
    const syncUnitsDoneEvent = receivedData.find(data =>
      data && data.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE' && data.event_data && Array.isArray(data.event_data.external_sync_units)
    );
    
    expect(syncUnitsDoneEvent).toBeDefined();
    expect(syncUnitsDoneEvent.event_data.external_sync_units).toBeInstanceOf(Array);
    
    // Verify we have at least 2 sync units as defined in the worker.ts file
    expect(syncUnitsDoneEvent.event_data.external_sync_units.length).toBeGreaterThanOrEqual(2);
    
    // Log the structure for debugging
    console.log('Sync units done event structure:', JSON.stringify(syncUnitsDoneEvent, null, 2));
    
    // Ensure the external_sync_units array exists before proceeding
    expect(syncUnitsDoneEvent.event_data).toHaveProperty('external_sync_units');
    
    syncUnitsDoneEvent.event_data.external_sync_units.forEach((unit: ExternalSyncUnit) => {
      expect(unit).toHaveProperty('id');
      expect(unit).toHaveProperty('name');
      expect(unit).toHaveProperty('description');
      expect(unit).toHaveProperty('item_count');
      expect(unit).toHaveProperty('item_type');
    });

    // Verify event type
    expect(syncUnitsDoneEvent).toHaveProperty('event_type');
    expect(syncUnitsDoneEvent.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    
    // Verify event context
    expect(syncUnitsDoneEvent).toHaveProperty('event_context');
    
    // Verify specific sync units from the worker.ts implementation using the correct path
    const testUnit1 = syncUnitsDoneEvent.event_data.external_sync_units.find(
      (unit: ExternalSyncUnit) => unit.id === 'test-sync-unit-1'
    );
    const testUnit2 = syncUnitsDoneEvent.event_data.external_sync_units.find(
      (unit: ExternalSyncUnit) => unit.id === 'test-sync-unit-2'
    );
    
    expect(testUnit1).toBeDefined();
    if (testUnit1) {
      expect(testUnit1.name).toBe('Test Sync Unit 1');
    }
  });
});