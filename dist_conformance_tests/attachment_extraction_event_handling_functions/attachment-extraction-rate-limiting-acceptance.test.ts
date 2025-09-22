import { CallbackServer, getTestEnvironment, createEventFromJson, callSnapInServer, startRateLimiting, endRateLimiting } from './test-utils';
import attachmentsExtractionTestJson from './attachments_extraction_test.json';

describe('Attachment Extraction Rate Limiting Acceptance Tests', () => {
  let callbackServer: CallbackServer;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = new CallbackServer();
    await callbackServer.start();
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  beforeEach(() => {
    callbackServer.clearEvents();
  });

  describe('Rate Limiting Handling', () => {
    test('should handle rate limiting during EXTRACTION_ATTACHMENTS_START and receive exactly one EXTRACTION_ATTACHMENTS_DONE callback', async () => {
      const testName = 'attachment_extraction_rate_limiting_test';
      console.log(`Starting rate limiting acceptance test: ${testName}`);

      // Step 1: Start rate limiting
      console.log('Step 1: Starting rate limiting...');
      try {
        await startRateLimiting(testName);
        console.log('Step 1: Successfully started rate limiting');
      } catch (error) {
        throw new Error(`Step 1 failed: Failed to start rate limiting: ${error}`);
      }

      try {
        // Step 2: Invoke The Extraction Function using attachments_extraction_test.json
        console.log('Step 2: Invoking extraction function with EXTRACTION_ATTACHMENTS_START event...');
        
        const attachmentExtractionEvent = createEventFromJson(attachmentsExtractionTestJson, testEnv);
        
        // Verify the event type is correct
        if (attachmentExtractionEvent.payload.event_type !== 'EXTRACTION_ATTACHMENTS_START') {
          throw new Error(`Step 2 failed: Expected event_type to be 'EXTRACTION_ATTACHMENTS_START', but got: '${attachmentExtractionEvent.payload.event_type}'`);
        }

        let response;
        try {
          response = await callSnapInServer(attachmentExtractionEvent);
        } catch (error) {
          throw new Error(`Step 2 failed: Failed to invoke extraction function with EXTRACTION_ATTACHMENTS_START event: ${error}`);
        }

        expect(response).toBeDefined();
        if (response.error) {
          throw new Error(`Step 2 failed: Extraction function returned error: ${JSON.stringify(response.error)}`);
        }

        console.log('Step 2: Successfully invoked extraction function, waiting for callback event...');

        // Wait for callback event from DevRev
        const callbackEvent = await callbackServer.waitForEvent('EXTRACTION_ATTACHMENTS_DONE', 90000); // Extended timeout for rate limiting
        
        if (!callbackEvent) {
          const receivedEvents = callbackServer.getEvents();
          throw new Error(`Step 2 failed: Expected to receive exactly one EXTRACTION_ATTACHMENTS_DONE event from DevRev callback server, but received: ${JSON.stringify(receivedEvents, null, 2)}`);
        }

        // Validate that exactly one event was received
        const allEvents = callbackServer.getEvents();
        if (allEvents.length !== 1) {
          throw new Error(`Step 2 failed: Expected to receive exactly one callback event, but received ${allEvents.length} events: ${JSON.stringify(allEvents, null, 2)}`);
        }

        // Validate the event type
        if (callbackEvent.event_type !== 'EXTRACTION_ATTACHMENTS_DONE') {
          throw new Error(`Step 2 failed: Expected callback event to have event_type 'EXTRACTION_ATTACHMENTS_DONE', but received: '${callbackEvent.event_type}'. Full event: ${JSON.stringify(callbackEvent, null, 2)}`);
        }

        console.log('Step 2: Successfully received exactly one EXTRACTION_ATTACHMENTS_DONE event');

      } finally {
        // Step 3: End rate limiting (always execute this step)
        console.log('Step 3: Ending rate limiting...');
        try {
          await endRateLimiting();
          console.log('Step 3: Successfully ended rate limiting');
        } catch (error) {
          console.error(`Step 3 failed: Failed to end rate limiting: ${error}`);
          // Don't throw here as we want to see the main test results
        }
      }

      console.log(`Rate limiting acceptance test completed successfully: ${testName}`);
    }, 120000); // 2 minute timeout to account for rate limiting delays
  });
});