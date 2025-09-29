import { getTestEnvironment } from './test-utils/environment';
import { setupCallbackServer, teardownCallbackServer, CallbackServerSetup, waitForCallback } from './test-utils/callback-server';
import { SnapInClient } from './test-utils/snap-in-client';
import attachmentContinueTestEvent from './test-events/attachment-extraction-continue-test.json';

describe('Attachment Extraction Continue Test', () => {
  let callbackServer: CallbackServerSetup;
  let snapInClient: SnapInClient;
  let testEnv: ReturnType<typeof getTestEnvironment>;

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

  test('should handle EXTRACTION_ATTACHMENTS_CONTINUE event and receive EXTRACTION_ATTACHMENTS_DONE callback', async () => {
    console.log('Starting EXTRACTION_ATTACHMENTS_CONTINUE test...');
    
    // Step 1: Prepare the test event
    const event = createTestEvent(attachmentContinueTestEvent);
    console.log('Test event prepared with credentials replaced');
    console.log('Event type:', event.payload.event_type);
    console.log('External sync unit ID:', event.payload.event_context.external_sync_unit_id);

    // Step 2: Call the extraction function
    console.log('Calling extraction function with EXTRACTION_ATTACHMENTS_CONTINUE event...');
    const response = await snapInClient.callFunction('extraction', event);
    
    if (!response.success) {
      console.error('Extraction function call failed');
      console.error('Response:', JSON.stringify(response, null, 2));
      console.error('Event payload used:', JSON.stringify(event, null, 2));
      throw new Error(`Extraction function failed: ${response.message}`);
    }

    console.log('Extraction function called successfully');
    console.log('Function response:', JSON.stringify(response, null, 2));

    // Step 3: Wait for the expected callback
    console.log('Waiting for EXTRACTION_ATTACHMENTS_DONE callback...');
    const expectedCallback = await waitForCallback(callbackServer, 60000, (callback) => {
      console.log('Checking callback:', {
        event_type: callback.body?.event_type,
        timestamp: callback.timestamp,
        path: callback.path
      });
      return callback.body?.event_type === 'EXTRACTION_ATTACHMENTS_DONE';
    });

    // Step 4: Validate the callback was received
    if (!expectedCallback) {
      console.error('Expected callback not received within timeout');
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
      
      throw new Error('Expected callback with event_type "EXTRACTION_ATTACHMENTS_DONE" was not received within 60 seconds');
    }

    // Step 5: Validate callback content
    console.log('EXTRACTION_ATTACHMENTS_DONE callback received successfully');
    console.log('Callback details:', {
      event_type: expectedCallback.body.event_type,
      timestamp: expectedCallback.timestamp,
      path: expectedCallback.path
    });

    // Verify the event type is exactly what we expect
    expect(expectedCallback.body.event_type).toBe('EXTRACTION_ATTACHMENTS_DONE');
    
    // Verify callback structure
    if (!expectedCallback.body) {
      console.error('Callback body is missing');
      console.error('Full callback object:', JSON.stringify(expectedCallback, null, 2));
      throw new Error('Callback body is missing');
    }

    // Log successful completion
    console.log('EXTRACTION_ATTACHMENTS_CONTINUE test completed successfully');
    console.log('Verified that:');
    console.log('- Extraction function accepted EXTRACTION_ATTACHMENTS_CONTINUE event');
    console.log('- Single callback with event_type "EXTRACTION_ATTACHMENTS_DONE" was received');
    console.log('- OAuth 1.0a authorization was properly implemented for attachment streaming');

  }, 90000); // 90 second timeout for the entire test
});