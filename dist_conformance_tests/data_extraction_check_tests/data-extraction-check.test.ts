import { setupCallbackServer, createTestEvent, sendEventToSnapIn, CallbackServerSetup } from './test-utils';

describe('Data Extraction Check Function', () => {
  let callbackServer: CallbackServerSetup;
  
  beforeAll(async () => {
    try {
      callbackServer = await setupCallbackServer();
    } catch (error) {
      throw new Error(`Failed to setup callback server: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  test('should successfully invoke function with EXTRACTION_DATA_START event', async () => {
    const testEvent = createTestEvent('EXTRACTION_DATA_START');
    
    try {
      const response = await sendEventToSnapIn(testEvent);
      
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      
      // Verify the function executed without throwing errors
      if (response.error) {
        throw new Error(`Function execution failed: ${JSON.stringify(response.error, null, 2)}`);
      }
    } catch (error) {
      throw new Error(`Test failed for EXTRACTION_DATA_START event. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Event sent: ${JSON.stringify(testEvent, null, 2)}`);
    }
  }, 30000);

  test('should successfully invoke function with EXTRACTION_DATA_CONTINUE event', async () => {
    const testEvent = createTestEvent('EXTRACTION_DATA_CONTINUE');
    
    try {
      const response = await sendEventToSnapIn(testEvent);
      
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      
      // Verify the function executed without throwing errors
      if (response.error) {
        throw new Error(`Function execution failed: ${JSON.stringify(response.error, null, 2)}`);
      }
    } catch (error) {
      throw new Error(`Test failed for EXTRACTION_DATA_CONTINUE event. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Event sent: ${JSON.stringify(testEvent, null, 2)}`);
    }
  }, 30000);

  test('should complete data extraction workflow and emit EXTRACTION_DATA_DONE event', async () => {
    const testEvent = createTestEvent('EXTRACTION_DATA_START');
    
    try {
      // Send the event to the snap-in
      const response = await sendEventToSnapIn(testEvent);
      
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      
      if (response.error) {
        throw new Error(`Function execution failed: ${JSON.stringify(response.error, null, 2)}`);
      }
      
      // Wait for the callback event indicating completion
      const callbackEvent = await callbackServer.waitForEvent(15000);
      
      expect(callbackEvent).toBeDefined();
      expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');
      
      // Verify the event structure
      if (!callbackEvent.event_type) {
        throw new Error(`Invalid callback event structure. Missing event_type. Received: ${JSON.stringify(callbackEvent, null, 2)}`);
      }
      
      if (callbackEvent.event_type !== 'EXTRACTION_DATA_DONE') {
        throw new Error(`Expected EXTRACTION_DATA_DONE event but received: ${callbackEvent.event_type}. Full event: ${JSON.stringify(callbackEvent, null, 2)}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const receivedEvents = callbackServer.receivedEvents.length;
      
      throw new Error(`Data extraction workflow test failed. Error: ${errorMessage}. Received callback events: ${receivedEvents}. Events: ${JSON.stringify(callbackServer.receivedEvents, null, 2)}`);
    }
  }, 45000);
});