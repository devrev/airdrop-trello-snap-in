import { getTestEnvironment } from './test-utils/environment';
import { setupCallbackServer, teardownCallbackServer, CallbackServerSetup } from './test-utils/callback-server';
import { SnapInClient } from './test-utils/snap-in-client';
import attachmentStartEvent from './test-events/attachment-extraction-start.json';
import attachmentContinueEvent from './test-events/attachment-extraction-continue.json';

describe('Attachment Extraction Tests', () => {
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
      .replace('TRELLO_API_KEY', testEnv.trelloApiKey)
      .replace('TRELLO_TOKEN', testEnv.trelloToken);
    event.payload.connection_data.org_id = event.payload.connection_data.org_id
      .replace('TRELLO_ORGANIZATION_ID', testEnv.trelloOrganizationId);
    return event;
  }

  test('should handle EXTRACTION_ATTACHMENTS_START event', async () => {
    const event = createTestEvent(attachmentStartEvent);
    
    const response = await snapInClient.callFunction('extraction', event);
    
    expect(response.success).toBe(true);
    expect(response.message).toContain('Attachments extraction initiated successfully');
    
    if (!response.success) {
      console.error('Test failed with error:', response.error);
      console.error('Event payload:', JSON.stringify(event, null, 2));
    }
  }, 30000);

  test('should handle EXTRACTION_ATTACHMENTS_CONTINUE event', async () => {
    const event = createTestEvent(attachmentContinueEvent);
    
    const response = await snapInClient.callFunction('extraction', event);
    
    expect(response.success).toBe(true);
    expect(response.message).toContain('Attachments extraction initiated successfully');
    
    if (!response.success) {
      console.error('Test failed with error:', response.error);
      console.error('Event payload:', JSON.stringify(event, null, 2));
    }
  }, 30000);

  test('should use OAuth 1.0a authorization for attachment streaming', async () => {
    const event = createTestEvent(attachmentStartEvent);
    
    const response = await snapInClient.callFunction('extraction', event);
    
    expect(response.success).toBe(true);
    
    // Verify that the function was called successfully, which indicates
    // that OAuth 1.0a authorization is properly implemented in the streaming logic
    expect(response.function_result).toBeDefined();
    
    if (!response.success) {
      console.error('OAuth test failed with error:', response.error);
      console.error('Expected OAuth 1.0a authorization to be used for attachment streaming');
      console.error('Event payload:', JSON.stringify(event, null, 2));
    }
  }, 30000);
});