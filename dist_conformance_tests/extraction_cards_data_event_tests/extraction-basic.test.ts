import { getTestEnvironment, setupCallbackServer, closeServer, createBaseEvent, sendEventToSnapIn, TestServers } from './test-utils';

describe('Extraction Function - Basic Invocation', () => {
  let testServers: TestServers;
  const env = getTestEnvironment();

  beforeAll(async () => {
    testServers = await setupCallbackServer();
  });

  afterAll(async () => {
    if (testServers?.callbackServer) {
      await closeServer(testServers.callbackServer);
    }
  });

  test('should successfully invoke extraction function with EXTRACTION_DATA_START event', async () => {
    // Create test event for data extraction start
    const event = createBaseEvent(env, 'extraction', 'EXTRACTION_DATA_START');

    // Send event to snap-in server
    const response = await sendEventToSnapIn(event);

    // Verify the function was invoked successfully
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    
    if (response.function_result) {
      expect(response.function_result.success).toBe(true);
      expect(response.function_result.message).toContain('Data extraction initiated successfully');
    }
  }, 60000);

  test('should successfully invoke extraction function with EXTRACTION_DATA_CONTINUE event', async () => {
    // Create test event for data extraction continue
    const event = createBaseEvent(env, 'extraction', 'EXTRACTION_DATA_CONTINUE');

    // Send event to snap-in server
    const response = await sendEventToSnapIn(event);

    // Verify the function was invoked successfully
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    
    if (response.function_result) {
      expect(response.function_result.success).toBe(true);
      expect(response.function_result.message).toContain('Data extraction initiated successfully');
    }
  }, 60000);
});