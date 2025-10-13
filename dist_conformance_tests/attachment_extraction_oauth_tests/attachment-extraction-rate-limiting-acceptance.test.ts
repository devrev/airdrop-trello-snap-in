import { 
  getTestEnvironment, 
  setupCallbackServer, 
  sendEventToSnapIn, 
  loadTestEventFromFile,
  waitForCallbackEvent,
  startRateLimiting,
  endRateLimiting,
  CallbackServerSetup 
} from './test-utils';

describe('Attachment Extraction Rate Limiting Acceptance Test', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: ReturnType<typeof getTestEnvironment>;
  const testName = `rate-limiting-test-${Date.now()}`;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    // Ensure rate limiting is ended even if test fails
    try {
      await endRateLimiting();
    } catch (error) {
      console.warn('Failed to end rate limiting in afterAll:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    if (callbackServer) {
      await callbackServer.close();
    }
  });

  beforeEach(() => {
    callbackServer.receivedEvents.length = 0;
  });

  test('should handle attachment extraction with rate limiting and receive EXTRACTION_ATTACHMENTS_DONE callback', async () => {
    console.log(`Starting Attachment Extraction Rate Limiting Acceptance Test with identifier: ${testName}`);
    const testStartTime = Date.now();

    try {
      // Step 1: Start rate limiting
      console.log('Step 1: Starting rate limiting...');
      const step1StartTime = Date.now();
      
      await startRateLimiting(testName);
      const step1EndTime = Date.now();
      
      console.log(`Rate limiting started successfully in ${step1EndTime - step1StartTime}ms`);

      // Step 2: Load and send attachment extraction event
      console.log('Step 2: Loading and sending attachment extraction event...');
      const step2StartTime = Date.now();
      
      const attachmentExtractionEvent = loadTestEventFromFile('attachments_extraction_test.json', testEnv);
      console.log(`Loaded attachment extraction event: ${JSON.stringify({
        event_type: attachmentExtractionEvent.payload.event_type,
        external_sync_unit_id: attachmentExtractionEvent.payload.event_context.external_sync_unit_id,
        request_id: attachmentExtractionEvent.execution_metadata.request_id,
        function_name: attachmentExtractionEvent.execution_metadata.function_name
      })}`);

      // Validate the event type is correct
      if (attachmentExtractionEvent.payload.event_type !== 'EXTRACTION_ATTACHMENTS_START') {
        throw new Error(
          `Expected event_type to be 'EXTRACTION_ATTACHMENTS_START', but got '${attachmentExtractionEvent.payload.event_type}'. ` +
          `Full event: ${JSON.stringify(attachmentExtractionEvent, null, 2)}`
        );
      }

      const attachmentExtractionResponse = await sendEventToSnapIn(attachmentExtractionEvent);
      const step2EndTime = Date.now();
      
      console.log(`Attachment extraction request completed in ${step2EndTime - step2StartTime}ms`);
      console.log(`Attachment extraction response: ${JSON.stringify(attachmentExtractionResponse)}`);

      if (attachmentExtractionResponse.error) {
        throw new Error(
          `Step 2 failed: Attachment extraction returned error: ${JSON.stringify(attachmentExtractionResponse.error)}. ` +
          `Event: ${JSON.stringify(attachmentExtractionEvent, null, 2)}`
        );
      }

      // Wait for EXTRACTION_ATTACHMENTS_DONE callback
      console.log('Waiting for EXTRACTION_ATTACHMENTS_DONE callback...');
      const callbackStartTime = Date.now();
      
      const callbackEvent = await waitForCallbackEvent(
        callbackServer, 
        'EXTRACTION_ATTACHMENTS_DONE', 
        90000 // Extended timeout for rate limiting scenarios
      );
      const callbackEndTime = Date.now();
      
      console.log(`Received EXTRACTION_ATTACHMENTS_DONE callback after ${callbackEndTime - callbackStartTime}ms`);
      console.log(`Callback event: ${JSON.stringify(callbackEvent, null, 2)}`);

      // Validate callback event structure
      if (!callbackEvent) {
        throw new Error(
          `Expected callback event but received undefined. ` +
          `All received events: ${JSON.stringify(callbackServer.receivedEvents, null, 2)}`
        );
      }

      if (callbackEvent.event_type !== 'EXTRACTION_ATTACHMENTS_DONE') {
        throw new Error(
          `Expected callback event_type to be 'EXTRACTION_ATTACHMENTS_DONE', but got '${callbackEvent.event_type}'. ` +
          `Full callback event: ${JSON.stringify(callbackEvent, null, 2)}`
        );
      }

      // Verify we received exactly one EXTRACTION_ATTACHMENTS_DONE callback event
      const attachmentDoneEvents = callbackServer.receivedEvents.filter(e => 
        e.event && e.event.event_type === 'EXTRACTION_ATTACHMENTS_DONE'
      );

      if (attachmentDoneEvents.length !== 1) {
        throw new Error(
          `Expected exactly 1 EXTRACTION_ATTACHMENTS_DONE callback event, but received ${attachmentDoneEvents.length}. ` +
          `All callback events: ${JSON.stringify(callbackServer.receivedEvents.map(e => ({
            timestamp: e.timestamp,
            event_type: e.event?.event_type,
            event_data_keys: e.event?.event_data ? Object.keys(e.event.event_data) : []
          })), null, 2)}`
        );
      }

      // Step 3: End rate limiting
      console.log('Step 3: Ending rate limiting...');
      const step3StartTime = Date.now();
      
      await endRateLimiting();
      const step3EndTime = Date.now();
      
      console.log(`Rate limiting ended successfully in ${step3EndTime - step3StartTime}ms`);

      const testEndTime = Date.now();
      console.log(`Attachment Extraction Rate Limiting Acceptance Test completed successfully in ${testEndTime - testStartTime}ms`);
      
      // Log final summary
      console.log('Test Summary:');
      console.log(`- Step 1 (Start Rate Limiting): ${step1EndTime - step1StartTime}ms`);
      console.log(`- Step 2 (Attachment Extraction): ${step2EndTime - step2StartTime}ms`);
      console.log(`- Step 2 Callback Wait: ${callbackEndTime - callbackStartTime}ms`);
      console.log(`- Step 3 (End Rate Limiting): ${step3EndTime - step3StartTime}ms`);
      console.log(`- Total Test Time: ${testEndTime - testStartTime}ms`);
      console.log(`- Total Callback Events Received: ${callbackServer.receivedEvents.length}`);
      console.log(`- EXTRACTION_ATTACHMENTS_DONE Events: ${attachmentDoneEvents.length}`);

    } catch (error) {
      const testEndTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`Attachment Extraction Rate Limiting Acceptance Test failed after ${testEndTime - testStartTime}ms`);
      console.error(`Error: ${errorMessage}`);
      console.error(`Total callback events received: ${callbackServer.receivedEvents.length}`);
      console.error(`All callback events: ${JSON.stringify(callbackServer.receivedEvents, null, 2)}`);
      
      // Attempt to end rate limiting even on failure
      try {
        console.log('Attempting to end rate limiting after test failure...');
        await endRateLimiting();
        console.log('Rate limiting ended successfully after test failure');
      } catch (cleanupError) {
        console.error('Failed to end rate limiting after test failure:', cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error');
      }
      
      throw new Error(
        `Attachment Extraction Rate Limiting Acceptance Test failed: ${errorMessage}. ` +
        `Test duration: ${testEndTime - testStartTime}ms. ` +
        `Callback events received: ${callbackServer.receivedEvents.length}. ` +
        `Expected: exactly 1 EXTRACTION_ATTACHMENTS_DONE event. ` +
        `Test identifier: ${testName}`
      );
    }
  }, 120000); // 120 second timeout as per test requirements
});