import { getTestEnvironment, setupCallbackServer, createExtractionEventPayload, sendEventToSnapIn, CallbackServerSetup, TestEnvironment } from './test-utils';

describe('Extraction Function - Users Data Push', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: TestEnvironment;

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

  test('should handle EXTRACTION_DATA_START event without errors', async () => {
    const event = createExtractionEventPayload('EXTRACTION_DATA_START', testEnv);
    
    const response = await sendEventToSnapIn(event);
    
    expect(response.success).toBe(true);
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    
    if (!response.success) {
      console.error('Test failed with error:', {
        status: response.status,
        data: response.data,
        error: response.error,
        timestamp: new Date().toISOString(),
      });
    }
  }, 30000);

  test('should handle EXTRACTION_DATA_CONTINUE event without errors', async () => {
    const event = createExtractionEventPayload('EXTRACTION_DATA_CONTINUE', testEnv);
    
    const response = await sendEventToSnapIn(event);
    
    expect(response.success).toBe(true);
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    
    if (!response.success) {
      console.error('Test failed with error:', {
        status: response.status,
        data: response.data,
        error: response.error,
        timestamp: new Date().toISOString(),
      });
    }
  }, 30000);

  test('should fetch and push users data when users.completed is false', async () => {
    const initialState = {
      users: { completed: false },
      cards: { completed: false, before: undefined, modifiedSince: undefined },
      attachments: { completed: false },
    };
    
    const event = createExtractionEventPayload('EXTRACTION_DATA_START', testEnv, initialState);
    
    const response = await sendEventToSnapIn(event);
    
    expect(response.success).toBe(true);
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    
    // Verify the function executed successfully
    if (response.data.function_result) {
      expect(response.data.error).toBeUndefined();
    }
    
    if (!response.success) {
      console.error('Complex test failed with detailed info:', {
        status: response.status,
        data: response.data,
        error: response.error,
        initialState,
        eventType: 'EXTRACTION_DATA_START',
        timestamp: new Date().toISOString(),
        trelloOrgId: testEnv.trelloOrganizationId,
      });
    }
    
    // Additional verification that the function completed without throwing errors
    expect(response.data.error).toBeUndefined();
  }, 60000);
});