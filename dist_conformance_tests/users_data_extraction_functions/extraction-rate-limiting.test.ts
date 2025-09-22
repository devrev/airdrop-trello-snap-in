import { CallbackServer, getTestEnvironment, sendEventToSnapIn } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

describe('Extraction Function - Rate Limiting Acceptance Test', () => {
  let callbackServer: CallbackServer;
  let testEnv: ReturnType<typeof getTestEnvironment>;
  const testIdentifier = 'extraction-rate-limiting-test';
  const rateLimitingApiUrl = 'http://localhost:8004';

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = new CallbackServer();
    await callbackServer.start();
  });

  afterAll(async () => {
    await callbackServer.stop();
    
    // Ensure rate limiting is ended even if test fails
    try {
      await axios.post(`${rateLimitingApiUrl}/end_rate_limiting`, {}, {
        timeout: 5000
      });
    } catch (error) {
      console.warn('Failed to end rate limiting in cleanup:', error instanceof Error ? error.message : String(error));
    }
  });

  beforeEach(() => {
    callbackServer.clearCallbacks();
  });

  test('should handle rate limiting and emit EXTRACTION_DATA_DELAY when EXTRACTION_DATA_START is received', async () => {
    let rateLimitingStarted = false;
    
    try {
      // Step 1: Start rate limiting
      console.log('Step 1: Starting rate limiting...');
      try {
        const startRateLimitingResponse = await axios.post(
          `${rateLimitingApiUrl}/start_rate_limiting`,
          { test_name: testIdentifier },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          }
        );
        
        if (startRateLimitingResponse.status !== 200) {
          throw new Error(
            `Failed to start rate limiting. Expected status 200, got ${startRateLimitingResponse.status}. ` +
            `Response: ${JSON.stringify(startRateLimitingResponse.data, null, 2)}`
          );
        }
        
        rateLimitingStarted = true;
        console.log('Rate limiting started successfully');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(
            `Failed to start rate limiting via API call to ${rateLimitingApiUrl}/start_rate_limiting. ` +
            `Status: ${error.response?.status || 'unknown'}, ` +
            `Message: ${error.message}, ` +
            `Response data: ${JSON.stringify(error.response?.data, null, 2)}`
          );
        }
        throw new Error(`Failed to start rate limiting: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Step 2: Load and prepare the test payload
      console.log('Step 2: Preparing and sending EXTRACTION_DATA_START event...');
      const payloadPath = path.join(__dirname, 'data_extraction_test_payload.json');
      
      if (!fs.existsSync(payloadPath)) {
        throw new Error(`Test payload file not found at: ${payloadPath}`);
      }

      let testPayload;
      try {
        const payloadContent = fs.readFileSync(payloadPath, 'utf8');
        testPayload = JSON.parse(payloadContent);
      } catch (error) {
        throw new Error(`Failed to parse test payload JSON: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Replace placeholders with actual environment variables
      const payloadString = JSON.stringify(testPayload)
        .replace(/<TRELLO_API_KEY>/g, testEnv.trelloApiKey)
        .replace(/<TRELLO_TOKEN>/g, testEnv.trelloToken)
        .replace(/<TRELLO_ORGANIZATION_ID>/g, testEnv.trelloOrganizationId);

      const event = JSON.parse(payloadString);

      // Ensure the event type is EXTRACTION_DATA_START
      event.payload.event_type = 'EXTRACTION_DATA_START';
      event.execution_metadata.event_type = 'EXTRACTION_DATA_START';

      // Send event to snap-in
      let response;
      try {
        response = await sendEventToSnapIn(event);
      } catch (error) {
        throw new Error(`Failed to send event to snap-in: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Assert initial response
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      expect(response.error).toBeUndefined();

      console.log('Event sent successfully, waiting for callback...');

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 15000));

      // Get callbacks from the callback server
      const callbacks = callbackServer.getCallbacks();
      
      if (callbacks.length === 0) {
        throw new Error(
          'Expected to receive at least one callback, but received none. ' +
          'This indicates the extraction process did not complete or did not send callbacks to the callback server. ' +
          'Rate limiting should have triggered an EXTRACTION_DATA_DELAY event.'
        );
      }

      console.log(`Received ${callbacks.length} callback(s)`);

      // Find the EXTRACTION_DATA_DELAY callback
      const dataDelayCallbacks = callbacks.filter(callback => 
        callback.body && 
        callback.body.event_type === 'EXTRACTION_DATA_DELAY'
      );

      if (dataDelayCallbacks.length === 0) {
        const receivedEventTypes = callbacks
          .filter(cb => cb.body && cb.body.event_type)
          .map(cb => cb.body.event_type);
        
        throw new Error(
          `Expected to receive exactly one callback with event_type "EXTRACTION_DATA_DELAY" due to rate limiting, but received none. ` +
          `Received callbacks with event_types: [${receivedEventTypes.join(', ')}]. ` +
          `Total callbacks received: ${callbacks.length}. ` +
          `This indicates that rate limiting was not properly handled by the extraction function. ` +
          `Full callback data: ${JSON.stringify(callbacks, null, 2)}`
        );
      }

      if (dataDelayCallbacks.length > 1) {
        throw new Error(
          `Expected to receive exactly one callback with event_type "EXTRACTION_DATA_DELAY", but received ${dataDelayCallbacks.length}. ` +
          `This indicates multiple delay events were sent. ` +
          `Full callback data: ${JSON.stringify(dataDelayCallbacks, null, 2)}`
        );
      }

      const extractionDelayCallback = dataDelayCallbacks[0];

      // Validate the callback structure
      if (!extractionDelayCallback.body.event_data) {
        throw new Error(
          `Expected EXTRACTION_DATA_DELAY callback to contain "event_data" field, but it was missing. ` +
          `Received callback body: ${JSON.stringify(extractionDelayCallback.body, null, 2)}`
        );
      }

      const eventData = extractionDelayCallback.body.event_data;
      
      if (eventData.delay === undefined || eventData.delay === null) {
        throw new Error(
          `Expected event_data to contain "delay" field for EXTRACTION_DATA_DELAY event, but it was missing or null. ` +
          `Received event_data: ${JSON.stringify(eventData, null, 2)}`
        );
      }

      if (typeof eventData.delay !== 'number' || eventData.delay <= 0) {
        throw new Error(
          `Expected "delay" to be a positive number, but received: ${typeof eventData.delay} with value ${eventData.delay}. ` +
          `Event data: ${JSON.stringify(eventData, null, 2)}`
        );
      }

      console.log(`Rate limiting handled correctly with delay: ${eventData.delay} seconds`);

      // Step 3: End rate limiting
      console.log('Step 3: Ending rate limiting...');
      try {
        const endRateLimitingResponse = await axios.post(
          `${rateLimitingApiUrl}/end_rate_limiting`,
          {},
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          }
        );
        
        if (endRateLimitingResponse.status !== 200) {
          throw new Error(
            `Failed to end rate limiting. Expected status 200, got ${endRateLimitingResponse.status}. ` +
            `Response: ${JSON.stringify(endRateLimitingResponse.data, null, 2)}`
          );
        }
        
        rateLimitingStarted = false;
        console.log('Rate limiting ended successfully');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(
            `Failed to end rate limiting via API call to ${rateLimitingApiUrl}/end_rate_limiting. ` +
            `Status: ${error.response?.status || 'unknown'}, ` +
            `Message: ${error.message}, ` +
            `Response data: ${JSON.stringify(error.response?.data, null, 2)}`
          );
        }
        throw new Error(`Failed to end rate limiting: ${error instanceof Error ? error.message : String(error)}`);
      }

      // All assertions passed
      expect(dataDelayCallbacks).toHaveLength(1);
      expect(eventData.delay).toBeGreaterThan(0);
      expect(typeof eventData.delay).toBe('number');

    } catch (error) {
      // Ensure rate limiting is ended if test fails
      if (rateLimitingStarted) {
        try {
          await axios.post(`${rateLimitingApiUrl}/end_rate_limiting`, {}, {
            timeout: 5000
          });
          console.log('Rate limiting ended in error cleanup');
        } catch (cleanupError) {
          console.error('Failed to end rate limiting in error cleanup:', cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
        }
      }
      throw error;
    }

  }, 60000); // Extended timeout for rate limiting test
});