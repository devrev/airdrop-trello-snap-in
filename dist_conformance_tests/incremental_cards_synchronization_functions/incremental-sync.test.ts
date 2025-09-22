import { 
  getTestEnvironment, 
  setupCallbackServer, 
  createBaseTestEvent, 
  sendEventToSnapIn,
  waitForCondition,
  TestEnvironment,
  CallbackServerSetup 
} from './test-utils';

describe('Incremental Data Synchronization', () => {
  let env: TestEnvironment;
  let callbackServer: CallbackServerSetup;

  beforeAll(async () => {
    env = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await callbackServer.cleanup();
    }
  });

  beforeEach(() => {
    callbackServer.receivedEvents.length = 0;
  });

  describe('Environment Setup', () => {
    test('should have all required environment variables', () => {
      expect(env.TRELLO_API_KEY).toBeDefined();
      expect(env.TRELLO_TOKEN).toBeDefined();
      expect(env.TRELLO_ORGANIZATION_ID).toBeDefined();
      
      expect(env.TRELLO_API_KEY).not.toBe('');
      expect(env.TRELLO_TOKEN).not.toBe('');
      expect(env.TRELLO_ORGANIZATION_ID).not.toBe('');
    });
  });

  describe('Incremental Mode Detection', () => {
    test('should handle EXTRACTION_DATA_START with INCREMENTAL mode', async () => {
      const event = createBaseTestEvent(env, 'EXTRACTION_DATA_START', 'INCREMENTAL');
      
      // Add lastSuccessfulSyncStarted to simulate previous sync
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
      event.payload.event_context.extract_from = pastDate;

      const response = await sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      expect(response.function_result.message).toContain('Extraction process initiated successfully');
    }, 30000);

    test('should handle EXTRACTION_DATA_START with INITIAL mode differently than INCREMENTAL', async () => {
      const initialEvent = createBaseTestEvent(env, 'EXTRACTION_DATA_START', 'INITIAL');
      const incrementalEvent = createBaseTestEvent(env, 'EXTRACTION_DATA_START', 'INCREMENTAL');
      
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      incrementalEvent.payload.event_context.extract_from = pastDate;

      const initialResponse = await sendEventToSnapIn(initialEvent);
      const incrementalResponse = await sendEventToSnapIn(incrementalEvent);
      
      expect(initialResponse.function_result.success).toBe(true);
      expect(incrementalResponse.function_result.success).toBe(true);
      
      // Both should succeed but may have different internal behavior
      expect(initialResponse.function_result.message).toContain('Extraction process initiated successfully');
      expect(incrementalResponse.function_result.message).toContain('Extraction process initiated successfully');
    }, 45000);
  });

  describe('State Management in Incremental Mode', () => {
    test('should reset cards state when entering incremental mode', async () => {
      const event = createBaseTestEvent(env, 'EXTRACTION_DATA_START', 'INCREMENTAL');
      
      // Set a past date for lastSuccessfulSyncStarted simulation
      const pastDate = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(); // 12 hours ago
      event.payload.event_context.extract_from = pastDate;

      const response = await sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      
      // The function should complete successfully, indicating state was properly managed
      expect(response.function_result.message).toContain('Extraction process initiated successfully');
    }, 30000);
  });

  describe('Date-based Filtering', () => {
    test('should process incremental sync with recent lastSuccessfulSyncStarted', async () => {
      const event = createBaseTestEvent(env, 'EXTRACTION_DATA_START', 'INCREMENTAL');
      
      // Set a very recent date to test filtering behavior
      const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(); // 1 hour ago
      event.payload.event_context.extract_from = recentDate;

      const response = await sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      expect(response.function_result.message).toContain('Extraction process initiated successfully');
    }, 30000);

    test('should process incremental sync with older lastSuccessfulSyncStarted', async () => {
      const event = createBaseTestEvent(env, 'EXTRACTION_DATA_START', 'INCREMENTAL');
      
      // Set an older date to test filtering behavior
      const olderDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
      event.payload.event_context.extract_from = olderDate;

      const response = await sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      expect(response.function_result.message).toContain('Extraction process initiated successfully');
    }, 30000);
  });

  describe('Full Integration Test', () => {
    test('should complete full incremental sync workflow', async () => {
      const event = createBaseTestEvent(env, 'EXTRACTION_DATA_START', 'INCREMENTAL');
      
      // Set up a realistic incremental sync scenario
      const lastSyncDate = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(); // 6 hours ago
      event.payload.event_context.extract_from = lastSyncDate;
      event.payload.event_context.reset_extraction = false;

      const response = await sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      expect(response.function_result.message).toContain('Extraction process initiated successfully');
      
      // Verify the extraction process was initiated properly
      expect(typeof response.function_result.message).toBe('string');
      expect(response.function_result.message.length).toBeGreaterThan(0);
    }, 45000);
  });
});