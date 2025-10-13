import { setupCallbackServer, sendEventToSnapIn, CallbackServerSetup } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Data Extraction Check Acceptance Test', () => {
  let callbackServer: CallbackServerSetup;
  
  beforeAll(async () => {
    try {
      callbackServer = await setupCallbackServer();
    } catch (error) {
      throw new Error(`Failed to setup callback server for acceptance test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
  
  afterAll(async () => {
    if (callbackServer?.server) {
      await new Promise<void>((resolve) => {
        callbackServer.server.close(() => resolve());
      });
    }
  });
  
  beforeEach(() => {
    // Clear received events before each test
    callbackServer.receivedEvents.length = 0;
  });

  test('should complete data extraction workflow using resource event and emit EXTRACTION_DATA_DONE', async () => {
    let testEvent;
    
    try {
      // Load the test event from the JSON file
      const eventFilePath = path.join(__dirname, 'data-extraction-check-event.json');
      
      if (!fs.existsSync(eventFilePath)) {
        throw new Error(`Test event file not found at path: ${eventFilePath}`);
      }
      
      const eventFileContent = fs.readFileSync(eventFilePath, 'utf8');
      testEvent = JSON.parse(eventFileContent);
      
      // Validate the loaded event structure
      if (!testEvent.payload || !testEvent.payload.event_type) {
        throw new Error(`Invalid test event structure. Missing payload.event_type. Event: ${JSON.stringify(testEvent, null, 2)}`);
      }
      
      if (testEvent.payload.event_type !== 'EXTRACTION_DATA_START') {
        throw new Error(`Expected EXTRACTION_DATA_START event type but found: ${testEvent.payload.event_type}`);
      }
      
    } catch (error) {
      throw new Error(`Failed to load or parse test event from JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    try {
      // Send the event to the snap-in server
      const response = await sendEventToSnapIn(testEvent);
      
      // Verify the function was invoked successfully
      if (!response) {
        throw new Error('No response received from snap-in server');
      }
      
      if (response.error) {
        throw new Error(`Function execution failed with error: ${JSON.stringify(response.error, null, 2)}. Original event: ${JSON.stringify(testEvent, null, 2)}`);
      }
      
      // Wait for the callback event from DevRev indicating completion
      const callbackEvent = await callbackServer.waitForEvent(20000);
      
      // Verify the callback event was received
      if (!callbackEvent) {
        throw new Error(`No callback event received from DevRev. Expected EXTRACTION_DATA_DONE event. Received events count: ${callbackServer.receivedEvents.length}. Events: ${JSON.stringify(callbackServer.receivedEvents, null, 2)}`);
      }
      
      // Verify the event type is exactly what we expect
      if (!callbackEvent.event_type) {
        throw new Error(`Callback event missing event_type field. Received event structure: ${JSON.stringify(callbackEvent, null, 2)}`);
      }
      
      if (callbackEvent.event_type !== 'EXTRACTION_DATA_DONE') {
        throw new Error(`Expected callback event with event_type 'EXTRACTION_DATA_DONE' but received '${callbackEvent.event_type}'. Full callback event: ${JSON.stringify(callbackEvent, null, 2)}. All received events: ${JSON.stringify(callbackServer.receivedEvents, null, 2)}`);
      }
      
      // Test passes - we received the expected EXTRACTION_DATA_DONE event
      expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const receivedEventsCount = callbackServer.receivedEvents.length;
      const receivedEvents = JSON.stringify(callbackServer.receivedEvents, null, 2);
      
      throw new Error(`Acceptance test failed for data extraction check function. Error: ${errorMessage}. Received callback events: ${receivedEventsCount}. Event details: ${receivedEvents}. Original test event: ${JSON.stringify(testEvent, null, 2)}`);
    }
  }, 60000);
});