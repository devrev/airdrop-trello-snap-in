import { TestEnvironment } from './test-utils';

describe('External Sync Units Rate Limiting', () => {
  let testEnv: TestEnvironment;
  const testName = 'external-sync-units-rate-limiting-test';

  beforeEach(async () => {
    testEnv = new TestEnvironment();
    await testEnv.startCallbackServer();
    testEnv.clearReceivedEvents();
  });

  afterEach(async () => {
    await testEnv.stopCallbackServer();
    // Ensure rate limiting is ended even if test fails
    try {
      await testEnv.endRateLimiting();
    } catch (error) {
      console.warn('Failed to end rate limiting in afterEach:', error);
    }
  });

  test('should handle rate limiting and emit EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR', async () => {
    console.log(`Starting rate limiting test: ${testName}`);

    try {
      // Step 1: Start rate limiting
      console.log('Step 1: Starting rate limiting...');
      await testEnv.startRateLimiting(testName);
      console.log('Rate limiting started successfully');

      // Step 2: Send EXTRACTION_EXTERNAL_SYNC_UNITS_START event
      console.log('Step 2: Loading and sending event...');
      const event = testEnv.loadEventFromJsonFile('trello-external-sync-units-check.json');
      
      console.log('Sending event to snap-in:', JSON.stringify({
        event_type: event.payload.event_type,
        connection_data: {
          ...event.payload.connection_data,
          key: '[REDACTED]' // Don't log credentials
        }
      }, null, 2));

      await testEnv.sendEventToSnapIn(event);
      console.log('Event sent to snap-in successfully');

      // Wait for callback event with extended timeout for rate limiting scenarios
      console.log('Waiting for callback event...');
      const receivedEvents = await testEnv.waitForEvents(1, 30000);
      
      console.log('Received events from callback server:', JSON.stringify(receivedEvents.map(e => ({
        event_type: e.event_type,
        timestamp: e.timestamp,
        event_data: e.event_data
      })), null, 2));

      // Verify exactly one event was received
      expect(receivedEvents).toHaveLength(1);
      if (receivedEvents.length !== 1) {
        throw new Error(`Expected exactly 1 callback event, but received ${receivedEvents.length}. Events: ${JSON.stringify(receivedEvents, null, 2)}`);
      }

      const callbackEvent = receivedEvents[0];

      // Verify event type is EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR
      expect(callbackEvent.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR');
      if (callbackEvent.event_type !== 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR') {
        throw new Error(`Expected event_type to be 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR', but received '${callbackEvent.event_type}'. Full event: ${JSON.stringify(callbackEvent, null, 2)}`);
      }

      // Verify event_data exists and contains error information
      expect(callbackEvent.event_data).toBeDefined();
      if (!callbackEvent.event_data) {
        throw new Error(`event_data is undefined in callback event: ${JSON.stringify(callbackEvent, null, 2)}`);
      }

      expect(callbackEvent.event_data.error).toBeDefined();
      if (!callbackEvent.event_data.error) {
        throw new Error(`error field is undefined in event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}`);
      }

      expect(callbackEvent.event_data.error.message).toBeDefined();
      expect(typeof callbackEvent.event_data.error.message).toBe('string');
      if (!callbackEvent.event_data.error.message || typeof callbackEvent.event_data.error.message !== 'string') {
        throw new Error(`error.message is missing or not a string: ${JSON.stringify(callbackEvent.event_data.error, null, 2)}`);
      }

      console.log('Rate limiting error handled correctly. Error message:', callbackEvent.event_data.error.message);

      // Step 3: End rate limiting
      console.log('Step 3: Ending rate limiting...');
      await testEnv.endRateLimiting();
      console.log('Rate limiting ended successfully');

      console.log('Rate limiting test completed successfully');

    } catch (error) {
      console.error('Rate limiting test failed:', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        test_name: testName
      });

      // Ensure rate limiting is ended even if test fails
      try {
        await testEnv.endRateLimiting();
        console.log('Rate limiting ended after test failure');
      } catch (cleanupError) {
        console.error('Failed to end rate limiting after test failure:', cleanupError);
      }

      throw error;
    }
  });

  test('should handle rate limiting with proper error structure validation', async () => {
    const detailedTestName = `${testName}-detailed-validation`;
    console.log(`Starting detailed rate limiting validation test: ${detailedTestName}`);

    try {
      // Step 1: Start rate limiting
      await testEnv.startRateLimiting(detailedTestName);

      // Step 2: Send event and validate detailed error structure
      const event = testEnv.loadEventFromJsonFile('trello-external-sync-units-check.json');
      await testEnv.sendEventToSnapIn(event);

      const receivedEvents = await testEnv.waitForEvents(1, 30000);
      const callbackEvent = receivedEvents[0];

      // Detailed validation of error response structure
      expect(callbackEvent).toHaveProperty('event_type');
      expect(callbackEvent).toHaveProperty('event_data');
      expect(callbackEvent).toHaveProperty('timestamp');

      expect(callbackEvent.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR');
      expect(callbackEvent.event_data).toHaveProperty('error');
      expect(callbackEvent.event_data.error).toHaveProperty('message');

      // Verify error message is meaningful (not empty or generic)
      const errorMessage = callbackEvent.event_data.error.message;
      expect(errorMessage.length).toBeGreaterThan(0);
      expect(typeof errorMessage).toBe('string');

      // Log detailed validation results
      console.log('Detailed validation passed:', {
        event_type: callbackEvent.event_type,
        has_error_data: !!callbackEvent.event_data.error,
        error_message_length: errorMessage.length,
        error_message_preview: errorMessage.substring(0, 100)
      });

      // Step 3: End rate limiting
      await testEnv.endRateLimiting();

    } catch (error) {
      try {
        await testEnv.endRateLimiting();
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
      throw error;
    }
  });
});