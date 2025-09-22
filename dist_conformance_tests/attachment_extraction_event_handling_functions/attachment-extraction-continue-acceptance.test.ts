import { CallbackServer, getTestEnvironment, createEventFromJson, callSnapInServer } from './test-utils';
import attachmentsExtractionContinueTestJson from './attachments_extraction_continue_test.json';

describe('Attachment Extraction Continue Acceptance Tests', () => {
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

  describe('EXTRACTION_ATTACHMENTS_CONTINUE Event Processing', () => {
    test('should process EXTRACTION_ATTACHMENTS_CONTINUE event and receive exactly one EXTRACTION_ATTACHMENTS_DONE callback', async () => {
      console.log('Starting EXTRACTION_ATTACHMENTS_CONTINUE acceptance test...');
      
      // Create the test event from the JSON resource
      const attachmentContinueEvent = createEventFromJson(attachmentsExtractionContinueTestJson, testEnv);
      
      // Verify the event type is correct
      expect(attachmentContinueEvent.payload.event_type).toBe('EXTRACTION_ATTACHMENTS_CONTINUE');
      console.log('Test event created with event_type:', attachmentContinueEvent.payload.event_type);

      // Invoke The Extraction Function
      let response;
      try {
        response = await callSnapInServer(attachmentContinueEvent);
      } catch (error) {
        throw new Error(`Failed to invoke extraction function with EXTRACTION_ATTACHMENTS_CONTINUE event: ${error}`);
      }

      expect(response).toBeDefined();
      if (response.error) {
        throw new Error(`Extraction function returned error: ${JSON.stringify(response.error)}`);
      }

      console.log('Successfully invoked extraction function, waiting for callback event...');

      // Wait for callback event from DevRev
      const callbackEvent = await callbackServer.waitForEvent('EXTRACTION_ATTACHMENTS_DONE', 60000);
      
      if (!callbackEvent) {
        const receivedEvents = callbackServer.getEvents();
        throw new Error(`Expected to receive exactly one EXTRACTION_ATTACHMENTS_DONE event from DevRev callback server, but received: ${JSON.stringify(receivedEvents, null, 2)}`);
      }

      // Validate that exactly one event was received
      const allEvents = callbackServer.getEvents();
      if (allEvents.length !== 1) {
        throw new Error(`Expected to receive exactly one callback event, but received ${allEvents.length} events: ${JSON.stringify(allEvents, null, 2)}`);
      }

      // Validate the event type
      if (callbackEvent.event_type !== 'EXTRACTION_ATTACHMENTS_DONE') {
        throw new Error(`Expected callback event to have event_type 'EXTRACTION_ATTACHMENTS_DONE', but received: '${callbackEvent.event_type}'. Full event: ${JSON.stringify(callbackEvent, null, 2)}`);
      }

      console.log('Successfully received EXTRACTION_ATTACHMENTS_DONE event');
      console.log('EXTRACTION_ATTACHMENTS_CONTINUE acceptance test completed successfully');
    }, 120000); // 2 minute timeout
  });
});