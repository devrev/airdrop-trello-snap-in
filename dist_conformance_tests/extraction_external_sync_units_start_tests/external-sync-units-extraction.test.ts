import { TestEnvironment, CallbackEvent } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('External Sync Units Extraction Acceptance Test', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    const credentials = TestEnvironment.getCredentialsFromEnv();
    testEnv = new TestEnvironment(credentials);
    await testEnv.setupCallbackServer();
  });

  afterAll(async () => {
    await testEnv.teardownCallbackServer();
  });

  beforeEach(() => {
    testEnv.clearReceivedEvents();
  });

  describe('Trello External Sync Units Extraction', () => {
    test('should extract external sync units and receive EXTRACTION_EXTERNAL_SYNC_UNITS_DONE callback', async () => {
      // Load and process the test event from JSON file
      const testEvent = testEnv.loadAndProcessTestEvent('trello_external_sync_unit_check.json');
      
      // Send the event to the snap-in server
      const response = await testEnv.sendEventToSnapIn(testEvent);
      
      // Verify the initial response
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      expect(response.function_result.message).toContain('External sync units extraction initiated successfully');
      
      // Wait for the callback event with timeout
      const callbackEvent = await testEnv.waitForCallbackEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE', 30000);
      
      // Validate the callback event
      expect(callbackEvent).toBeDefined();
      expect(callbackEvent.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
      expect(callbackEvent.event_data).toBeDefined();
      expect(callbackEvent.event_data.external_sync_units).toBeDefined();
      expect(Array.isArray(callbackEvent.event_data.external_sync_units)).toBe(true);
      
      // Validate external sync units structure
      const externalSyncUnits = callbackEvent.event_data.external_sync_units;
      expect(externalSyncUnits.length).toBeGreaterThan(0);
      
      // Validate each external sync unit has required fields
      externalSyncUnits.forEach((unit: any, index: number) => {
        expect(unit.id).toBeDefined();
        expect(typeof unit.id).toBe('string');
        expect(unit.id.length).toBeGreaterThan(0);
        
        expect(unit.name).toBeDefined();
        expect(typeof unit.name).toBe('string');
        expect(unit.name.length).toBeGreaterThan(0);
        
        expect(unit.description).toBeDefined();
        expect(typeof unit.description).toBe('string');
        
        expect(unit.item_type).toBeDefined();
        expect(unit.item_type).toBe('cards');
      });
      
      // Verify that exactly one callback event was received
      const allReceivedEvents = testEnv.getReceivedEvents();
      const doneEvents = allReceivedEvents.filter(event => event.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
      expect(doneEvents).toHaveLength(1);
      
      // Verify no error events were received
      const errorEvents = allReceivedEvents.filter(event => event.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR');
      expect(errorEvents).toHaveLength(0);
      
    }, 60000);

    test('should handle missing credentials gracefully', async () => {
      // Create a test event with invalid credentials
      const testEvent = testEnv.loadAndProcessTestEvent('trello_external_sync_unit_check.json');
      testEvent.payload.connection_data.key = 'key=invalid&token=invalid';
      
      // Send the event to the snap-in server
      const response = await testEnv.sendEventToSnapIn(testEvent);
      
      // Verify the initial response
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      
      // Wait for either success or error callback
      const callbackEvent = await testEnv.waitForAnyCallbackEvent(['EXTRACTION_EXTERNAL_SYNC_UNITS_DONE', 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR'], 30000);
      
      // Should receive an error event due to invalid credentials
      expect(callbackEvent).toBeDefined();
      expect(callbackEvent.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR');
      expect(callbackEvent.event_data).toBeDefined();
      expect(callbackEvent.event_data.error).toBeDefined();
      expect(callbackEvent.event_data.error.message).toBeDefined();
      
    }, 60000);
  });
});