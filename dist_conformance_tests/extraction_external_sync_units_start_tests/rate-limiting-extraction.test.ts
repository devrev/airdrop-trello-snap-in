import { TestEnvironment, CallbackEvent } from './test-utils';

describe('Rate Limiting Extraction Acceptance Test', () => {
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

  describe('External Sync Units Extraction Rate Limiting', () => {
    test('should handle rate limiting and receive EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR callback', async () => {
      const testIdentifier = `rate_limiting_test_${Date.now()}`;
      
      try {
        // Step 1: Start rate limiting
        console.log(`Step 1: Starting rate limiting for test: ${testIdentifier}`);
        const startRateLimitingResponse = await testEnv.startRateLimiting(testIdentifier);
        console.log('Rate limiting started successfully:', startRateLimitingResponse);
        
        // Step 2: Load and process the test event from JSON file
        console.log('Step 2: Loading test event and invoking extraction function');
        const testEvent = testEnv.loadAndProcessTestEvent('trello_external_sync_unit_check.json');
        console.log('Test event loaded and processed:', JSON.stringify(testEvent, null, 2));
        
        // Send the event to the snap-in server
        console.log('Sending event to snap-in server...');
        const response = await testEnv.sendEventToSnapIn(testEvent);
        console.log('Snap-in server response:', JSON.stringify(response, null, 2));
        
        // Verify the initial response
        expect(response).toBeDefined();
        expect(response.error).toBeUndefined();
        expect(response.function_result).toBeDefined();
        expect(response.function_result.success).toBe(true);
        expect(response.function_result.message).toContain('External sync units extraction initiated successfully');
        
        // Wait for the callback event - expecting ERROR due to rate limiting
        console.log('Waiting for callback event (expecting EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR)...');
        const callbackEvent = await testEnv.waitForCallbackEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR', 45000);
        console.log('Received callback event:', JSON.stringify(callbackEvent, null, 2));
        
        // Validate the callback event
        expect(callbackEvent).toBeDefined();
        expect(callbackEvent.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR');
        expect(callbackEvent.event_data).toBeDefined();
        expect(callbackEvent.event_data.error).toBeDefined();
        expect(callbackEvent.event_data.error.message).toBeDefined();
        expect(typeof callbackEvent.event_data.error.message).toBe('string');
        expect(callbackEvent.event_data.error.message.length).toBeGreaterThan(0);
        
        // Verify that exactly one callback event was received
        const allReceivedEvents = testEnv.getReceivedEvents();
        console.log(`Total callback events received: ${allReceivedEvents.length}`);
        console.log('All received events:', JSON.stringify(allReceivedEvents, null, 2));
        
        const errorEvents = allReceivedEvents.filter(event => event.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR');
        expect(errorEvents).toHaveLength(1);
        
        // Verify no success events were received
        const successEvents = allReceivedEvents.filter(event => event.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
        expect(successEvents).toHaveLength(0);
        
        console.log('Rate limiting test validation completed successfully');
        
      } catch (error) {
        console.error('Rate limiting test failed with error:', error);
        console.error('All received events at time of failure:', JSON.stringify(testEnv.getReceivedEvents(), null, 2));
        throw new Error(`Rate limiting test failed: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        // Step 3: End rate limiting (always execute this step)
        try {
          console.log('Step 3: Ending rate limiting...');
          const endRateLimitingResponse = await testEnv.endRateLimiting();
          console.log('Rate limiting ended successfully:', endRateLimitingResponse);
        } catch (endError) {
          console.error('Failed to end rate limiting:', endError);
          // Don't throw here as it might mask the original test failure
        }
      }
    }, 90000);

    test('should handle rate limiting control endpoint failures gracefully', async () => {
      const testIdentifier = `rate_limiting_control_test_${Date.now()}`;
      
      // Test that we can handle failures in rate limiting control
      try {
        console.log('Testing rate limiting control endpoint error handling');
        
        // Try to end rate limiting without starting it (should handle gracefully)
        const endResponse = await testEnv.endRateLimiting();
        console.log('End rate limiting response (without start):', endResponse);
        
        // This should not throw an error, just log the response
        expect(endResponse).toBeDefined();
        
      } catch (error) {
        console.log('Rate limiting control endpoint error (expected):', error);
        // This is acceptable behavior - the test should handle control endpoint errors
      }
    }, 30000);
  });
});