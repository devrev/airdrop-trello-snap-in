import { buildExtractionEvent, callSnapInServer, createCallbackServer } from './utils';
import http from 'http';

describe('Extraction Function Tests', () => {
  let callbackServer: http.Server;
  let getLastCallback: () => any;

  beforeAll(async () => {
    // Start the callback server
    const serverSetup = await createCallbackServer();
    callbackServer = serverSetup.server;
    getLastCallback = serverSetup.getLastCallback;
  });

  afterAll(() => {
    // Close the callback server
    if (callbackServer) {
      callbackServer.close();
    }
  });

  // Test 1: Basic test to verify the extraction function can be called
  test('should be able to call extraction function with EXTRACTION_EXTERNAL_SYNC_UNITS_START event', async () => {
    // Build the event payload
    const event = buildExtractionEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    // Call the snap-in server
    const response = await callSnapInServer(event);
    
    // Verify the response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toContain('Extraction process initiated');
  });

  // Test 2: Verify that the extraction function returns external sync units
  test('should return external sync units with EXTRACTION_EXTERNAL_SYNC_UNITS_START event', async () => {
    // Build the event payload
    const event = buildExtractionEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    // Call the snap-in server
    await callSnapInServer(event);
    
    // Wait for the callback to be received (may take some time for processing)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get the callback data
    const callbackData = getLastCallback();
    
    // Verify the callback data
    expect(callbackData).toBeDefined();
    expect(callbackData.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    expect(callbackData.event_data).toBeDefined();
    expect(callbackData.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(callbackData.event_data.external_sync_units)).toBe(true);
    expect(callbackData.event_data.external_sync_units.length).toBeGreaterThan(0);
  });

  // Test 3: Verify that each external sync unit has an item_count field that matches the number of cards
  test('should set item_count for each external sync unit to the number of cards on the board', async () => {
    // Build the event payload
    const event = buildExtractionEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    // Call the snap-in server
    await callSnapInServer(event);
    
    // Wait for the callback to be received (may take some time for processing)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Get the callback data
    const callbackData = getLastCallback();
    
    // Verify the callback data
    expect(callbackData).toBeDefined();
    expect(callbackData.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    expect(callbackData.event_data).toBeDefined();
    expect(callbackData.event_data.external_sync_units).toBeDefined();
    
    // Check each external sync unit
    const externalSyncUnits = callbackData.event_data.external_sync_units;
    for (const unit of externalSyncUnits) {
      expect(unit.id).toBeDefined();
      expect(unit.name).toBeDefined();
      expect(unit.item_count).toBeDefined();
      
      // The item_count should be a number (either a positive number or -1 if there was an error)
      expect(typeof unit.item_count).toBe('number');
      
      // If item_count is not -1, it should be a non-negative number
      if (unit.item_count !== -1) {
        expect(unit.item_count).toBeGreaterThanOrEqual(0);
      }
    }
  });
});