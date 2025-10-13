import { 
  getTestEnvironment, 
  setupCallbackServer, 
  sendEventToSnapIn, 
  loadTestEventFromFile,
  waitForCallbackEvent,
  CallbackServerSetup 
} from './test-utils';

describe('Attachment Extraction Continue Acceptance Test', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await callbackServer.close();
    }
  });

  beforeEach(() => {
    callbackServer.receivedEvents.length = 0;
  });

  test('should handle EXTRACTION_ATTACHMENTS_CONTINUE and receive EXTRACTION_ATTACHMENTS_DONE callback', async () => {
    console.log('Starting Attachment Extraction Continue Acceptance Test');
    const testStartTime = Date.now();

    try {
      // Load the test event from the JSON file
      console.log('Loading test event from attachments_extraction_continue_test.json...');
      const loadStartTime = Date.now();
      
      const attachmentContinueEvent = loadTestEventFromFile('attachments_extraction_continue_test.json', testEnv);
      const loadEndTime = Date.now();
      
      console.log(`Test event loaded in ${loadEndTime - loadStartTime}ms`);
      console.log(`Event details: ${JSON.stringify({
        event_type: attachmentContinueEvent.payload.event_type,
        external_sync_unit_id: attachmentContinueEvent.payload.event_context.external_sync_unit_id,
        request_id: attachmentContinueEvent.execution_metadata.request_id,
        function_name: attachmentContinueEvent.execution_metadata.function_name
      })}`);

      // Validate the event type is correct
      if (attachmentContinueEvent.payload.event_type !== 'EXTRACTION_ATTACHMENTS_CONTINUE') {
        throw new Error(
          `Expected event_type to be 'EXTRACTION_ATTACHMENTS_CONTINUE', but got '${attachmentContinueEvent.payload.event_type}'. ` +
          `Full event: ${JSON.stringify(attachmentContinueEvent, null, 2)}`
        );
      }

      // Send the event to the snap-in server
      console.log('Sending EXTRACTION_ATTACHMENTS_CONTINUE event to snap-in server...');
      const requestStartTime = Date.now();
      
      const response = await sendEventToSnapIn(attachmentContinueEvent);
      const requestEndTime = Date.now();
      
      console.log(`Snap-in request completed in ${requestEndTime - requestStartTime}ms`);
      console.log(`Response: ${JSON.stringify(response)}`);

      // Validate the response doesn't contain errors
      if (response.error) {
        throw new Error(
          `Snap-in returned error response: ${JSON.stringify(response.error)}. ` +
          `Full response: ${JSON.stringify(response, null, 2)}. ` +
          `Event sent: ${JSON.stringify(attachmentContinueEvent, null, 2)}`
        );
      }

      // Wait for the expected callback event
      console.log('Waiting for EXTRACTION_ATTACHMENTS_DONE callback event...');
      const callbackStartTime = Date.now();
      
      const callbackEvent = await waitForCallbackEvent(
        callbackServer, 
        'EXTRACTION_ATTACHMENTS_DONE', 
        60000 // 60 second timeout for attachment processing
      );
      const callbackEndTime = Date.now();
      
      console.log(`Received callback event after ${callbackEndTime - callbackStartTime}ms`);
      console.log(`Callback event: ${JSON.stringify(callbackEvent, null, 2)}`);

      // Validate the callback event structure
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

      // Verify we received exactly one callback event
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

      const testEndTime = Date.now();
      console.log(`Attachment Extraction Continue Acceptance Test completed successfully in ${testEndTime - testStartTime}ms`);
      
      // Log final summary
      console.log('Test Summary:');
      console.log(`- Event Loading: ${loadEndTime - loadStartTime}ms`);
      console.log(`- Snap-in Request: ${requestEndTime - requestStartTime}ms`);
      console.log(`- Callback Wait: ${callbackEndTime - callbackStartTime}ms`);
      console.log(`- Total Test Time: ${testEndTime - testStartTime}ms`);
      console.log(`- Total Callback Events Received: ${callbackServer.receivedEvents.length}`);
      console.log(`- EXTRACTION_ATTACHMENTS_DONE Events: ${attachmentDoneEvents.length}`);

    } catch (error) {
      const testEndTime = Date.now();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`Attachment Extraction Continue Acceptance Test failed after ${testEndTime - testStartTime}ms`);
      console.error(`Error: ${errorMessage}`);
      console.error(`Total callback events received: ${callbackServer.receivedEvents.length}`);
      console.error(`All callback events: ${JSON.stringify(callbackServer.receivedEvents, null, 2)}`);
      
      throw new Error(
        `Attachment Extraction Continue Acceptance Test failed: ${errorMessage}. ` +
        `Test duration: ${testEndTime - testStartTime}ms. ` +
        `Callback events received: ${callbackServer.receivedEvents.length}. ` +
        `Expected: exactly 1 EXTRACTION_ATTACHMENTS_DONE event.`
      );
    }
  }, 120000); // 120 second timeout as per test requirements
});