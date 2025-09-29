import {
  getTestEnvironment,
  createTestEvent,
  setupCallbackServer,
  sendEventToSnapIn,
  teardownCallbackServer,
  CallbackServerSetup,
  TestEnvironment,
} from './test-utils';

describe('fetch_boards function conformance tests', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    await teardownCallbackServer(callbackServer);
  });

  describe('Trivial: Basic invocation', () => {
    it('should respond with required fields structure', async () => {
      const event = createTestEvent('fetch_boards', testEnv);
      
      const response = await sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(typeof response.function_result.status_code).toBe('number');
      expect(typeof response.function_result.api_delay).toBe('number');
      expect(typeof response.function_result.message).toBe('string');
      
      // Should not have error field for successful invocation
      expect(response.error).toBeUndefined();
    }, 30000);
  });

  describe('Simple: Successful board fetching', () => {
    it('should successfully fetch boards with valid credentials', async () => {
      const event = createTestEvent('fetch_boards', testEnv);
      
      const response = await sendEventToSnapIn(event);
      
      expect(response.function_result).toBeDefined();
      expect(response.function_result.status_code).toBe(200);
      expect(response.function_result.api_delay).toBe(0);
      expect(response.function_result.message).toContain('Successfully fetched boards');
      expect(Array.isArray(response.function_result.boards)).toBe(true);
      
      // Validate board structure if boards exist
      if (response.function_result.boards.length > 0) {
        const board = response.function_result.boards[0];
        expect(typeof board.id).toBe('string');
        expect(typeof board.name).toBe('string');
      }
    }, 30000);
  });

  describe('Complex: Error handling scenarios', () => {
    it('should handle invalid credentials gracefully', async () => {
      const invalidEnv = {
        ...testEnv,
        trelloApiKey: 'invalid_key',
        trelloToken: 'invalid_token',
      };
      const event = createTestEvent('fetch_boards', invalidEnv);
      
      const response = await sendEventToSnapIn(event);
      
      expect(response.function_result).toBeDefined();
      expect(response.function_result.status_code).toBe(401);
      expect(response.function_result.api_delay).toBeGreaterThanOrEqual(0);
      expect(response.function_result.message).toContain('Authentication failed');
      expect(response.function_result.boards).toBeUndefined();
    }, 30000);

    it('should handle missing connection data', async () => {
      const event = createTestEvent('fetch_boards', testEnv);
      delete event.payload.connection_data;
      
      const response = await sendEventToSnapIn(event);
      
      expect(response.function_result).toBeDefined();
      expect(response.function_result.status_code).toBe(0);
      expect(response.function_result.api_delay).toBe(0);
      expect(response.function_result.message).toContain('Missing connection data');
      expect(response.function_result.boards).toBeUndefined();
    }, 30000);

    it('should handle malformed connection key', async () => {
      const event = createTestEvent('fetch_boards', testEnv);
      event.payload.connection_data.key = 'malformed_key_without_params';
      
      const response = await sendEventToSnapIn(event);
      
      expect(response.function_result).toBeDefined();
      expect(response.function_result.status_code).toBe(0);
      expect(response.function_result.api_delay).toBe(0);
      expect(response.function_result.message).toContain('Invalid connection data');
      expect(response.function_result.boards).toBeUndefined();
    }, 30000);
  });
});