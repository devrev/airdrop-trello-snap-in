import axios from 'axios';
import { 
  SNAP_IN_SERVER_URL, 
  createBaseEventPayload, 
  setupCallbackServer,
  shutdownCallbackServer
} from './utils';
import { Server } from 'http';

// Global variables for test suite
let server: Server;
let receivedCallbacks: any[];
let clearCallbacks: () => void;

// Setup before all tests
beforeAll(async () => {  
  const setup = await setupCallbackServer();
  server = setup.server;
  receivedCallbacks = setup.receivedCallbacks;
  clearCallbacks = setup.clearCallbacks;
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
});

describe('Extraction Function Tests', () => {
  // Test 1: Basic functionality test
  test('extraction function exists and can be invoked', async () => {
    const payload = createBaseEventPayload('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, payload);
    
    // Wait for callback to be received
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
  });

  // Test 2: Event type validation test
  test('extraction function handles incorrect event type', async () => {
    const payload = createBaseEventPayload('INVALID_EVENT_TYPE');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, payload);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('Unexpected event type');
  });

  // Clear callbacks before each test
  beforeEach(() => {
    clearCallbacks();
  });

  // Test 3: External sync units mapping test
  test('extraction function correctly maps boards to external sync units', async () => {    
    const payload = createBaseEventPayload('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    await axios.post(SNAP_IN_SERVER_URL, payload);
    
    // Wait for callback to be received with exponential backoff
    let attempts = 0;
    while (receivedCallbacks.length === 0 && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 500));
      attempts++;
    }
    
    // Verify callback was received
    expect(receivedCallbacks.length).toBeGreaterThan(0);
    
    const callback = receivedCallbacks[0];
    expect(callback.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    expect(callback.event_data).toBeDefined();
    expect(callback.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(callback.event_data.external_sync_units)).toBe(true);
    
    // Check that at least one external sync unit exists
    expect(callback.event_data.external_sync_units.length).toBeGreaterThan(0);
    
    // Verify the structure of the first external sync unit
    const firstUnit = callback.event_data.external_sync_units[0];
    expect(firstUnit.id).toBeDefined();
    expect(firstUnit.name).toBeDefined();
    expect(firstUnit.description).toBeDefined();
    expect(firstUnit.item_type).toBe('cards');
  });

  // Test 4: End-to-end test
  test('extraction function completes the full workflow', async () => {    
    // Clear previous callbacks
    clearCallbacks();
    
    const payload = createBaseEventPayload('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    const response = await axios.post(SNAP_IN_SERVER_URL, payload);
    
    // Verify the function response
    expect(response.status).toBe(200);
    expect(response.data.function_result.success).toBe(true);
    
    // Wait for callback to be received with exponential backoff
    let attempts = 0;
    while (receivedCallbacks.length === 0 && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 500));
      attempts++;
    }
    
    // Verify callback was received
    expect(receivedCallbacks.length).toBeGreaterThan(0);
    
    const callback = receivedCallbacks[0];
    expect(callback.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    
    // Verify external sync units structure
    const externalSyncUnits = callback.event_data.external_sync_units;
    expect(externalSyncUnits).toBeDefined();
    expect(Array.isArray(externalSyncUnits)).toBe(true);
    
    // Check each external sync unit has the required fields
    for (const unit of externalSyncUnits) {
      expect(unit.id).toBeDefined();
      expect(unit.name).toBeDefined();
      expect(unit.description).toBeDefined();
      expect(unit.item_type).toBe('cards');
    }
  });
});

// Cleanup after all tests
afterAll(() => {
  shutdownCallbackServer();
});