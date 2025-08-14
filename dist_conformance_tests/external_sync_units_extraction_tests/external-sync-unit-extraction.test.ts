import axios from 'axios';
import { CallbackServer } from './callback-server';
import { ExtractorEventType } from './types';

describe('External Sync Unit Extraction Acceptance Test', () => {
  const callbackServer = new CallbackServer();
  const testServerUrl = 'http://localhost:8000/handle/sync';
  
  // The test event from the resource file
  const testEventJson = {
    "execution_metadata": {
        "function_name": "test_external_sync_units",
        "devrev_endpoint": "http://localhost:8003"
    },
    "payload" : {
        "event_type": "EXTRACTION_EXTERNAL_SYNC_UNITS_START",
        "event_context": {
            "callback_url": "http://localhost:8002/callback",
            "dev_org": "test-dev-org",
            "external_sync_unit_id": "test-external-sync-unit",
            "sync_unit_id": "test-sync-unit",
            "worker_data_url": "http://localhost:8003/external-worker"
        },
        "connection_data": {
            "org_id": "test-org-id",
            "key": "key=test-key&token=test-token"
        }
    },
    "context": {
        "secrets": {
            "service_account_token": "test-token"
        }
    }
  };
  
  beforeAll(async () => {
    await callbackServer.start();
  });
  
  afterAll(async () => {
    await callbackServer.stop();
  });
  
  beforeEach(() => {
    callbackServer.clearCallbackEvents();
  });

  test('should process external sync unit extraction and send EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event', async () => {
    // Log the test event for debugging
    console.log('Sending test event:', JSON.stringify(testEventJson, null, 2));
    
    // Send the event to the test server
    const response = await axios.post(testServerUrl, testEventJson);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.error).toBeUndefined();
    console.log('Received response:', JSON.stringify(response.data, null, 2));
    
    // Wait for the callback event
    try {
      const callbackEvent = await callbackServer.waitForCallbackEvent(
        ExtractorEventType.ExtractionExternalSyncUnitsDone,
        15000 // 15 seconds timeout
      );
      
      // Verify the callback event
      expect(callbackEvent).toBeDefined();
      expect(callbackEvent.event_type).toBe(ExtractorEventType.ExtractionExternalSyncUnitsDone);
      expect(callbackEvent.event_data).toBeDefined();
      expect(callbackEvent.event_data.external_sync_units).toBeDefined();
      expect(Array.isArray(callbackEvent.event_data.external_sync_units)).toBe(true);
      
      // Log the callback event for debugging
      console.log('Received callback event:', JSON.stringify(callbackEvent, null, 2));
      
      // Verify that each external sync unit has the required properties
      callbackEvent.event_data.external_sync_units?.forEach(unit => {
        expect(unit.id).toBeDefined();
        expect(unit.name).toBeDefined();
        expect(unit.description).toBeDefined();
      });
    } catch (error) {
      // If we don't receive the expected callback event, fail with a detailed error message
      const events = callbackServer.getCallbackEvents();
      const eventsStr = JSON.stringify(events, null, 2);
      
      fail(
        `Did not receive expected EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event. ` +
        `Received events: ${eventsStr}. ` +
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, 30000); // 30 seconds timeout for the entire test
});