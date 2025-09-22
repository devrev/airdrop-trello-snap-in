import { TestUtils } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Extraction Function - Rate Limiting Acceptance Test', () => {
  let env: any;

  beforeAll(async () => {
    env = TestUtils.getEnvironment();
    await TestUtils.setupCallbackServer();
  });

  afterAll(async () => {
    await TestUtils.teardownCallbackServer();
  });

  beforeEach(() => {
    TestUtils.clearCallbackData();
  });

  test('should handle rate limiting with EXTRACTION_DATA_DELAY response', async () => {
    const testIdentifier = `rate_limiting_test_${Date.now()}`;
    
    try {
      // Step 1: Start rate limiting
      console.log(`Step 1: Starting rate limiting for test: ${testIdentifier}`);
      await TestUtils.startRateLimiting(testIdentifier);
      console.log('✓ Rate limiting started successfully');

      // Step 2: Invoke extraction function and verify EXTRACTION_DATA_DELAY response
      console.log('Step 2: Loading test payload and invoking extraction function');
      
      // Load the test payload from JSON file
      const payloadPath = path.join(__dirname, 'data_extraction_rate_limiting_test_payload.json');
      
      if (!fs.existsSync(payloadPath)) {
        throw new Error(`Test payload file not found at: ${payloadPath}`);
      }

      const rawPayload = fs.readFileSync(payloadPath, 'utf8');
      let event;
      
      try {
        event = JSON.parse(rawPayload);
      } catch (error) {
        throw new Error(`Failed to parse test payload JSON: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Replace placeholders with actual environment values
      const connectionKey = `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`;
      event.payload.connection_data.key = connectionKey;
      event.payload.connection_data.org_id = env.TRELLO_ORGANIZATION_ID;

      console.log('Sending EXTRACTION_DATA_START event to snap-in...');
      
      // Send the event to the snap-in
      const response = await TestUtils.sendEventToSnapIn(event);
      
      // Verify the snap-in accepted the request
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      
      console.log('Snap-in response:', response.function_result.message);
      console.log('Waiting for rate limiting callback event...');
      
      // Wait for the callback event (up to 30 seconds)
      const maxWaitTime = 30000; // 30 seconds
      const pollInterval = 500; // 0.5 seconds
      let waitTime = 0;
      let callbackData: any[] = [];
      
      while (waitTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        waitTime += pollInterval;
        
        callbackData = TestUtils.getCallbackData();
        
        // Check if we received any callback events
        if (callbackData.length > 0) {
          console.log(`Received ${callbackData.length} callback event(s) after ${waitTime}ms`);
          
          // Log all received events for debugging
          callbackData.forEach((event, index) => {
            console.log(`Callback event ${index + 1}:`, JSON.stringify(event, null, 2));
          });
          
          // Check if we have the expected EXTRACTION_DATA_DELAY event
          const delayEvent = callbackData.find(event => event.event_type === 'EXTRACTION_DATA_DELAY');
          if (delayEvent) {
            console.log('Found EXTRACTION_DATA_DELAY event');
            break;
          }
          
          // Check for unexpected completion or error events
          const finalEvent = callbackData[callbackData.length - 1];
          if (finalEvent.event_type === 'EXTRACTION_DATA_DONE') {
            throw new Error(`Expected EXTRACTION_DATA_DELAY event due to rate limiting, but received EXTRACTION_DATA_DONE instead. This suggests rate limiting was not properly triggered. Full event: ${JSON.stringify(finalEvent, null, 2)}`);
          } else if (finalEvent.event_type === 'EXTRACTION_DATA_ERROR') {
            throw new Error(`Expected EXTRACTION_DATA_DELAY event due to rate limiting, but received EXTRACTION_DATA_ERROR instead. Error details: ${JSON.stringify(finalEvent.error || finalEvent, null, 2)}`);
          }
        }
      }
      
      // Verify we received callback data
      if (callbackData.length === 0) {
        throw new Error(`No callback events received within ${maxWaitTime}ms. Expected exactly one callback event with event_type='EXTRACTION_DATA_DELAY' due to rate limiting.`);
      }
      
      // Verify we received exactly one callback event
      if (callbackData.length !== 1) {
        const eventTypes = callbackData.map(e => e.event_type);
        throw new Error(`Expected exactly 1 callback event with EXTRACTION_DATA_DELAY, but received ${callbackData.length} events with types: [${eventTypes.join(', ')}]. Full events: ${JSON.stringify(callbackData, null, 2)}`);
      }
      
      const callbackEvent = callbackData[0];
      
      // Verify the event type is EXTRACTION_DATA_DELAY
      if (callbackEvent.event_type !== 'EXTRACTION_DATA_DELAY') {
        throw new Error(`Expected callback event_type to be 'EXTRACTION_DATA_DELAY' due to rate limiting, but received '${callbackEvent.event_type}'. Full event: ${JSON.stringify(callbackEvent, null, 2)}`);
      }
      
      // Verify event_data exists
      if (!callbackEvent.event_data) {
        throw new Error(`Expected callback event to have 'event_data' property for EXTRACTION_DATA_DELAY, but it was missing. Full event: ${JSON.stringify(callbackEvent, null, 2)}`);
      }
      
      // Verify delay value is exactly 3
      const delayValue = callbackEvent.event_data.delay;
      if (delayValue !== 3) {
        throw new Error(`Expected event_data.delay to be exactly 3 seconds, but received: ${delayValue} (type: ${typeof delayValue}). Full event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}`);
      }
      
      console.log('✓ Rate limiting callback validation passed: event_type=EXTRACTION_DATA_DELAY, delay=3');
      
    } finally {
      // Step 3: End rate limiting (always execute this in finally block)
      try {
        console.log('Step 3: Ending rate limiting');
        await TestUtils.endRateLimiting();
        console.log('✓ Rate limiting ended successfully');
      } catch (endError) {
        console.error('Failed to end rate limiting:', endError);
        // Don't throw here to avoid masking the original test error
      }
    }
    
    console.log('✓ All rate limiting acceptance test criteria satisfied');
    
  }, 45000); // 45 second timeout to allow for rate limiting processing
});