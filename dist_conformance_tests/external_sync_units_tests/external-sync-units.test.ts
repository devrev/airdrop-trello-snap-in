import { CallbackServer, createTestEvent, sendEventToSnapIn, getEnvironmentConfig } from './test-utils';

describe('External Sync Units Test Function', () => {
  let callbackServer: CallbackServer;
  const config = getEnvironmentConfig();

  beforeAll(async () => {
    callbackServer = new CallbackServer();
    await callbackServer.start(config.callbackServerPort);
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  beforeEach(() => {
    callbackServer.clearCallbacks();
  });

  describe('Basic Function Invocation', () => {
    it('should successfully invoke the test_external_sync_units function', async () => {
      const event = createTestEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
      
      let response;
      try {
        response = await sendEventToSnapIn(event);
      } catch (error) {
        fail(`Function invocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      expect(response).toBeDefined();
      expect(typeof response).toBe('object');
    }, 30000);
  });

  describe('Event Type Validation', () => {
    it('should handle EXTRACTION_EXTERNAL_SYNC_UNITS_START event type', async () => {
      const event = createTestEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
      
      const response = await sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      
      if (response.error) {
        fail(`Function returned error: ${JSON.stringify(response.error, null, 2)}`);
      }
    }, 30000);

    it('should reject unsupported event types', async () => {
      const event = createTestEvent('UNSUPPORTED_EVENT_TYPE');
      
      try {
        const response = await sendEventToSnapIn(event);
        
        if (response.error) {
          expect(response.error).toBeDefined();
          expect(typeof response.error).toBe('object');
        } else {
          fail('Expected function to return error for unsupported event type');
        }
      } catch (error) {
        // This is expected for unsupported event types
        expect(error).toBeDefined();
      }
    }, 30000);
  });

  describe('Complete External Sync Units Workflow', () => {
    it('should complete the external sync units extraction workflow and emit EXTRACTION_EXTERNAL_SYNC_UNITS_DONE', async () => {
      const event = createTestEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
      
      // Send the event to the snap-in
      const response = await sendEventToSnapIn(event);
      
      // Verify the function executed successfully
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      
      if (response.error) {
        fail(`Function execution failed: ${JSON.stringify(response.error, null, 2)}`);
      }

      // Wait for callback to be received
      let callback;
      try {
        callback = await callbackServer.waitForCallback(10000);
      } catch (error) {
        const receivedCallbacks = callbackServer.getReceivedCallbacks();
        fail(`No callback received within timeout. Received callbacks: ${JSON.stringify(receivedCallbacks, null, 2)}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Verify callback structure
      expect(callback).toBeDefined();
      expect(callback.body).toBeDefined();
      expect(callback.body.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
      
      // Verify external sync units data
      expect(callback.body.event_data).toBeDefined();
      expect(callback.body.event_data.external_sync_units).toBeDefined();
      expect(Array.isArray(callback.body.event_data.external_sync_units)).toBe(true);
      expect(callback.body.event_data.external_sync_units.length).toBeGreaterThan(0);
      
      // Verify external sync unit structure
      const syncUnit = callback.body.event_data.external_sync_units[0];
      expect(syncUnit.id).toBeDefined();
      expect(typeof syncUnit.id).toBe('string');
      expect(syncUnit.name).toBeDefined();
      expect(typeof syncUnit.name).toBe('string');
      expect(syncUnit.description).toBeDefined();
      expect(typeof syncUnit.description).toBe('string');
      expect(syncUnit.item_count).toBeDefined();
      expect(typeof syncUnit.item_count).toBe('number');
      
      // Log success details for debugging
      console.log('External sync units extraction completed successfully:', {
        timestamp: new Date().toISOString(),
        event_type: callback.body.event_type,
        sync_units_count: callback.body.event_data.external_sync_units.length,
        first_sync_unit: syncUnit
      });
    }, 45000);
  });
});