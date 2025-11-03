import { CallbackServer, loadTestEventFromJson, sendEventToSnapIn, getEnvironmentConfig } from './test-utils';

describe('External Sync Units Acceptance Test', () => {
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

  describe('Acceptance Test using external_sync_unit_check.json', () => {
    it('should complete external sync units extraction workflow and receive EXTRACTION_EXTERNAL_SYNC_UNITS_DONE callback', async () => {
      // Load test event from JSON file
      let event;
      try {
        event = loadTestEventFromJson('./external-sync-unit-check.json');
      } catch (error) {
        fail(`Failed to load test event from JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      expect(event).toBeDefined();
      expect(event.payload).toBeDefined();
      expect(event.payload.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_START');

      // Log the event being sent for debugging
      console.log('Sending acceptance test event:', {
        timestamp: new Date().toISOString(),
        event_type: event.payload.event_type,
        function_name: event.execution_metadata.function_name,
        request_id: event.execution_metadata.request_id || 'not-set'
      });

      // Send the event to the snap-in
      let response;
      try {
        response = await sendEventToSnapIn(event);
      } catch (error) {
        fail(`Failed to send event to snap-in server: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Verify the function executed successfully
      expect(response).toBeDefined();
      if (response.error) {
        fail(`Function execution failed with error: ${JSON.stringify(response.error, null, 2)}`);
      }

      // Wait for callback to be received from DevRev
      let callback;
      try {
        callback = await callbackServer.waitForCallback(15000);
      } catch (error) {
        const receivedCallbacks = callbackServer.getReceivedCallbacks();
        const errorMessage = `No callback received from DevRev within timeout. Expected event_type: EXTRACTION_EXTERNAL_SYNC_UNITS_DONE. Received callbacks: ${JSON.stringify(receivedCallbacks, null, 2)}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        fail(errorMessage);
      }

      // Verify callback structure and content
      expect(callback).toBeDefined();
      expect(callback.body).toBeDefined();
      
      if (!callback.body.event_type) {
        fail(`Callback missing event_type field. Received callback: ${JSON.stringify(callback, null, 2)}`);
      }

      if (callback.body.event_type !== 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE') {
        fail(`Expected callback event_type to be 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE', but received '${callback.body.event_type}'. Full callback: ${JSON.stringify(callback, null, 2)}`);
      }

      // Verify the callback contains external sync units data
      expect(callback.body.event_data).toBeDefined();
      if (!callback.body.event_data) {
        fail(`Callback missing event_data field. Received callback: ${JSON.stringify(callback, null, 2)}`);
      }

      expect(callback.body.event_data.external_sync_units).toBeDefined();
      if (!callback.body.event_data.external_sync_units) {
        fail(`Callback event_data missing external_sync_units field. Received event_data: ${JSON.stringify(callback.body.event_data, null, 2)}`);
      }

      if (!Array.isArray(callback.body.event_data.external_sync_units)) {
        fail(`Expected external_sync_units to be an array, but received: ${typeof callback.body.event_data.external_sync_units}. Value: ${JSON.stringify(callback.body.event_data.external_sync_units, null, 2)}`);
      }

      if (callback.body.event_data.external_sync_units.length === 0) {
        fail(`Expected external_sync_units array to contain at least one item, but received empty array. Full callback: ${JSON.stringify(callback, null, 2)}`);
      }

      // Verify external sync unit structure
      const syncUnit = callback.body.event_data.external_sync_units[0];
      if (!syncUnit.id || typeof syncUnit.id !== 'string') {
        fail(`External sync unit missing or invalid 'id' field. Expected string, received: ${typeof syncUnit.id}. Sync unit: ${JSON.stringify(syncUnit, null, 2)}`);
      }

      if (!syncUnit.name || typeof syncUnit.name !== 'string') {
        fail(`External sync unit missing or invalid 'name' field. Expected string, received: ${typeof syncUnit.name}. Sync unit: ${JSON.stringify(syncUnit, null, 2)}`);
      }

      if (!syncUnit.description || typeof syncUnit.description !== 'string') {
        fail(`External sync unit missing or invalid 'description' field. Expected string, received: ${typeof syncUnit.description}. Sync unit: ${JSON.stringify(syncUnit, null, 2)}`);
      }

      if (typeof syncUnit.item_count !== 'number') {
        fail(`External sync unit missing or invalid 'item_count' field. Expected number, received: ${typeof syncUnit.item_count}. Sync unit: ${JSON.stringify(syncUnit, null, 2)}`);
      }

      // Log success details for debugging
      console.log('Acceptance test completed successfully:', {
        timestamp: new Date().toISOString(),
        received_event_type: callback.body.event_type,
        sync_units_count: callback.body.event_data.external_sync_units.length,
        first_sync_unit_id: syncUnit.id,
        first_sync_unit_name: syncUnit.name,
        callback_received_at: callback.timestamp
      });

      // Final assertion to ensure test passes
      expect(callback.body.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    }, 60000);
  });
});