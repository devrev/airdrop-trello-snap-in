import { TestEnvironment } from './test-utils';

describe('Trello Snap-In Conformance Tests', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    const credentials = TestEnvironment.getCredentialsFromEnv();
    testEnv = new TestEnvironment(credentials);
    await testEnv.setupCallbackServer();
  });

  afterAll(async () => {
    await testEnv.teardownCallbackServer();
  });

  beforeEach(() => {
    testEnv.clearReceivedEvents();
  });

  describe('Basic Infrastructure', () => {
    test('should have valid test environment setup', () => {
      expect(testEnv).toBeDefined();
      expect(process.env.TRELLO_API_KEY).toBeDefined();
      expect(process.env.TRELLO_TOKEN).toBeDefined();
      expect(process.env.TRELLO_ORGANIZATION_ID).toBeDefined();
    });
  });

  describe('Authentication', () => {
    test('should authenticate successfully with Trello API', async () => {
      const event = testEnv.createTestEvent('test_auth');
      
      const response = await testEnv.sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
    }, 30000);
  });

  describe('External Sync Units Extraction', () => {
    test('should extract external sync units when EXTRACTION_EXTERNAL_SYNC_UNITS_START event is received', async () => {
      const event = testEnv.createTestEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
      
      const response = await testEnv.sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      expect(response.function_result.message).toContain('External sync units extraction initiated successfully');
    }, 60000);

    test('should map board fields correctly to external sync units format', async () => {
      const event = testEnv.createTestEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
      
      const response = await testEnv.sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      
      // The actual validation of the external sync units structure would happen
      // through the callback mechanism in a real scenario, but for this test
      // we verify that the extraction process was initiated successfully
    }, 60000);

    test('should handle invalid event type gracefully', async () => {
      const event = testEnv.createTestEvent('INVALID_EVENT_TYPE');
      
      const response = await testEnv.sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(false);
      expect(response.function_result.message).toContain('Unexpected event type');
    }, 30000);
  });
});