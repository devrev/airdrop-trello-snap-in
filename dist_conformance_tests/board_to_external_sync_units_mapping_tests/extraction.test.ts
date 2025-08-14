import { snapInClient } from './utils/http-client';
import { CallbackServer } from './utils/callback-server';
import { createExtractionEvent, waitForTimeout } from './utils/test-helpers';
import { EventType, ExtractorEventType } from './utils/types';

describe('Extraction Function Tests', () => {
  const callbackServer = new CallbackServer();
  const callbackUrl = 'http://localhost:8002/callback';

  beforeAll(async () => {
    await callbackServer.start();
  }, 10000);

  afterAll(async () => {
    await callbackServer.stop();
  });

  beforeEach(() => {
    callbackServer.resetCallback();
  });

  // Basic test - verify the extraction function exists and can be invoked
  test('extraction function exists and can be invoked', async () => {
    const event = createExtractionEvent(EventType.ExtractionExternalSyncUnitsStart, callbackUrl);
    
    // Modify the event to test basic invocation without expecting a full response
    event.execution_metadata.function_name = 'health_check';
    
    const response = await snapInClient.post('/handle/sync', event);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
  });

  // Input validation test - verify the extraction function properly handles the event
  test('extraction function accepts EXTRACTION_EXTERNAL_SYNC_UNITS_START event', async () => {
    const event = createExtractionEvent(EventType.ExtractionExternalSyncUnitsStart, callbackUrl);
    
    // Set the function name to extraction
    event.execution_metadata.function_name = 'extraction';
    
    const response = await snapInClient.post('/handle/sync', event);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('success');
  });

  // Integration test - test the complete workflow with real credentials
  test('extraction function correctly maps Trello boards to external sync units', async () => {
    const event = createExtractionEvent(EventType.ExtractionExternalSyncUnitsStart, callbackUrl);
    
    // Set the function name to extraction
    event.execution_metadata.function_name = 'extraction';
    
    // Send the event to the snap-in
    const response = await snapInClient.post('/handle/sync', event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result.status).toBe('success');
    
    // Wait for the callback with the external sync units
    const callbackData = await callbackServer.waitForCallback(20000);
    
    // Verify the callback data
    expect(callbackData).toBeDefined();
    expect(callbackData.event_type).toBe(ExtractorEventType.ExtractionExternalSyncUnitsDone);
    expect(callbackData.event_data).toBeDefined();
    expect(callbackData.event_data.external_sync_units).toBeDefined();
    
    // Safely access the external sync units
    const externalSyncUnits = callbackData.event_data.external_sync_units || [];
    
    expect(Array.isArray(externalSyncUnits)).toBe(true);
    expect(externalSyncUnits.length).toBeGreaterThan(0);
    
    // Verify the structure of the external sync units
    if (externalSyncUnits.length === 0) {
      throw new Error('No external sync units returned');
    }
    const firstUnit = externalSyncUnits[0];
    expect(firstUnit).toHaveProperty('id');
    expect(firstUnit).toHaveProperty('name');
    expect(firstUnit).toHaveProperty('description');
    expect(firstUnit).toHaveProperty('item_type', 'tasks');
    
    // Verify the mapping from Trello boards to external sync units
    // We can't check exact values since we don't know what boards exist,
    // but we can verify the structure is correct
    expect(typeof firstUnit.id).toBe('string');
    expect(typeof firstUnit.name).toBe('string');
    expect(typeof firstUnit.description).toBe('string');
  });
});