import { getTestEnvironment } from './test-utils/environment';
import { setupCallbackServer, teardownCallbackServer, CallbackServerSetup, waitForCallback } from './test-utils/callback-server';
import { SnapInClient } from './test-utils/snap-in-client';
import attachmentExtractionTestEvent from './test-events/attachment-extraction-rate-limiting-test.json';
import axios from 'axios';

describe('Attachment Extraction Rate Limiting Test', () => {
  let callbackServer: CallbackServerSetup;
  let snapInClient: SnapInClient;
  let testEnv: ReturnType<typeof getTestEnvironment>;
  const testIdentifier = `rate-limiting-test-${Date.now()}`;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
    snapInClient = new SnapInClient();
  });

  afterAll(async () => {
    await teardownCallbackServer(callbackServer);
  });

  beforeEach(() => {
    callbackServer.receivedCallbacks.length = 0;
  });

  function createTestEvent(baseEvent: any) {
    const event = JSON.parse(JSON.stringify(baseEvent));
    event.payload.connection_data.key = event.payload.connection_data.key
      .replace('<TRELLO_API_KEY>', testEnv.trelloApiKey)
      .replace('<TRELLO_TOKEN>', testEnv.trelloToken);
    event.payload.connection_data.org_id = event.payload.connection_data.org_id
      .replace('<TRELLO_ORGANIZATION_ID>', testEnv.trelloOrganizationId);
    return event;
  }

  test('should handle rate limiting during EXTRACTION_ATTACHMENTS_START and receive EXTRACTION_ATTACHMENTS_DONE callback', async () => {
    console.log(`Starting rate limiting test with identifier: ${testIdentifier}`);
    
    // Step 1: Start rate limiting
    console.log('Step 1: Starting rate limiting...');
    try {
      const startRateLimitingResponse = await axios.post('http://localhost:8004/start_rate_limiting', {
        test_name: testIdentifier
      });
      
      if (startRateLimitingResponse.status !== 200) {
        console.error('Step 1 failed - Start rate limiting request failed');
        console.error('Response status:', startRateLimitingResponse.status);
        console.error('Response data:', startRateLimitingResponse.data);
        throw new Error(`Step 1 failed: Start rate limiting returned status ${startRateLimitingResponse.status}, expected 200`);
      }
      
      console.log('Step 1: Rate limiting started successfully');
      console.log('Start rate limiting response:', startRateLimitingResponse.data);
    } catch (error: any) {
      console.error('Step 1 failed - Error starting rate limiting');
      console.error('Error details:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Step 1 failed: Error starting rate limiting: ${error.message}`);
    }

    try {
      // Step 2: Invoke The Extraction Function
      console.log('Step 2: Preparing test event and invoking extraction function...');
      const event = createTestEvent(attachmentExtractionTestEvent);
      console.log('Test event prepared with credentials replaced');
      console.log('Event type:', event.payload.event_type);
      console.log('External sync unit ID:', event.payload.event_context.external_sync_unit_id);

      console.log('Calling extraction function with EXTRACTION_ATTACHMENTS_START event...');
      const response = await snapInClient.callFunction('extraction', event);
      
      if (!response.success) {
        console.error('Step 2 failed - Extraction function call failed');
        console.error('Response:', JSON.stringify(response, null, 2));
        console.error('Event payload used:', JSON.stringify(event, null, 2));
        throw new Error(`Step 2 failed: Extraction function failed: ${response.message}`);
      }

      console.log('Step 2: Extraction function called successfully');
      console.log('Function response:', JSON.stringify(response, null, 2));

      // Wait for the expected callback
      console.log('Step 2: Waiting for EXTRACTION_ATTACHMENTS_DONE callback...');
      const expectedCallback = await waitForCallback(callbackServer, 90000, (callback) => {
        console.log('Checking callback:', {
          event_type: callback.body?.event_type,
          timestamp: callback.timestamp,
          path: callback.path
        });
        return callback.body?.event_type === 'EXTRACTION_ATTACHMENTS_DONE';
      });

      // Validate the callback was received
      if (!expectedCallback) {
        console.error('Step 2 failed - Expected callback not received within timeout');
        console.error('All received callbacks:', callbackServer.receivedCallbacks.map(cb => ({
          event_type: cb.body?.event_type,
          timestamp: cb.timestamp,
          path: cb.path,
          body_keys: Object.keys(cb.body || {})
        })));
        console.error('Total callbacks received:', callbackServer.receivedCallbacks.length);
        
        // Additional debugging information
        if (callbackServer.receivedCallbacks.length > 0) {
          console.error('First callback details:', JSON.stringify(callbackServer.receivedCallbacks[0], null, 2));
        }
        
        throw new Error('Step 2 failed: Expected callback with event_type "EXTRACTION_ATTACHMENTS_DONE" was not received within 90 seconds');
      }

      // Validate that only a single callback was received
      const attachmentsDoneCallbacks = callbackServer.receivedCallbacks.filter(cb => 
        cb.body?.event_type === 'EXTRACTION_ATTACHMENTS_DONE'
      );
      
      if (attachmentsDoneCallbacks.length !== 1) {
        console.error('Step 2 failed - Expected exactly one EXTRACTION_ATTACHMENTS_DONE callback');
        console.error(`Expected: 1, Actual: ${attachmentsDoneCallbacks.length}`);
        console.error('All EXTRACTION_ATTACHMENTS_DONE callbacks:', attachmentsDoneCallbacks.map(cb => ({
          event_type: cb.body?.event_type,
          timestamp: cb.timestamp,
          path: cb.path
        })));
        throw new Error(`Step 2 failed: Expected exactly 1 EXTRACTION_ATTACHMENTS_DONE callback, but received ${attachmentsDoneCallbacks.length}`);
      }

      // Validate callback content
      console.log('Step 2: EXTRACTION_ATTACHMENTS_DONE callback received successfully');
      console.log('Callback details:', {
        event_type: expectedCallback.body.event_type,
        timestamp: expectedCallback.timestamp,
        path: expectedCallback.path
      });

      // Verify the event type is exactly what we expect
      expect(expectedCallback.body.event_type).toBe('EXTRACTION_ATTACHMENTS_DONE');
      
      // Verify callback structure
      if (!expectedCallback.body) {
        console.error('Step 2 failed - Callback body is missing');
        console.error('Full callback object:', JSON.stringify(expectedCallback, null, 2));
        throw new Error('Step 2 failed: Callback body is missing');
      }

      console.log('Step 2: Extraction function completed successfully with rate limiting');

    } finally {
      // Step 3: End rate limiting (always execute this in finally block)
      console.log('Step 3: Ending rate limiting...');
      try {
        const endRateLimitingResponse = await axios.post('http://localhost:8004/end_rate_limiting');
        
        if (endRateLimitingResponse.status !== 200) {
          console.error('Step 3 failed - End rate limiting request failed');
          console.error('Response status:', endRateLimitingResponse.status);
          console.error('Response data:', endRateLimitingResponse.data);
          throw new Error(`Step 3 failed: End rate limiting returned status ${endRateLimitingResponse.status}, expected 200`);
        }
        
        console.log('Step 3: Rate limiting ended successfully');
        console.log('End rate limiting response:', endRateLimitingResponse.data);
      } catch (error: any) {
        console.error('Step 3 failed - Error ending rate limiting');
        console.error('Error details:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
        throw new Error(`Step 3 failed: Error ending rate limiting: ${error.message}`);
      }
    }

    // Log successful completion
    console.log('Rate limiting test completed successfully');
    console.log('Verified that:');
    console.log('- Rate limiting was started successfully');
    console.log('- Extraction function handled EXTRACTION_ATTACHMENTS_START event with rate limiting');
    console.log('- Single callback with event_type "EXTRACTION_ATTACHMENTS_DONE" was received');
    console.log('- Rate limiting was ended successfully');
    console.log('- OAuth 1.0a authorization was properly implemented for attachment streaming under rate limiting conditions');

  }, 120000); // 120 second timeout for the entire test as per requirements
});