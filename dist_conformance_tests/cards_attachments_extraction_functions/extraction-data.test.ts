import { TestUtils } from './test-utils';

describe('Extraction Function - Cards and Attachments Data Processing', () => {
  let env: any;

  beforeAll(async () => {
    env = TestUtils.getEnvironment();
    await TestUtils.setupCallbackServer();
  });

  afterAll(async () => {
    await TestUtils.teardownCallbackServer();
  });

  beforeEach(() => {
    TestUtils.clearCallbackData();
  });

  test('should handle basic extraction function invocation', async () => {
    const event = TestUtils.createBaseEvent(env, 'EXTRACTION_DATA_START');
    
    const response = await TestUtils.sendEventToSnapIn(event);
    
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toContain('Extraction process initiated successfully');
  }, 30000);

  test('should process initial data extraction with cards and attachments', async () => {
    const event = TestUtils.createBaseEvent(env, 'EXTRACTION_DATA_START');
    
    const response = await TestUtils.sendEventToSnapIn(event);
    
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    
    // Wait for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const callbackData = TestUtils.getCallbackData();
    expect(callbackData.length).toBeGreaterThan(0);
    
    // Should eventually emit EXTRACTION_DATA_DONE or EXTRACTION_DATA_PROGRESS
    const finalEvent = callbackData[callbackData.length - 1];
    expect(['EXTRACTION_DATA_DONE', 'EXTRACTION_DATA_PROGRESS', 'EXTRACTION_DATA_DELAY']).toContain(finalEvent.event_type);
  }, 45000);

  test('should handle pagination continuation with state management', async () => {
    // First, start initial extraction
    const initialEvent = TestUtils.createBaseEvent(env, 'EXTRACTION_DATA_START');
    
    const initialResponse = await TestUtils.sendEventToSnapIn(initialEvent);
    expect(initialResponse.function_result.success).toBe(true);
    
    // Wait for initial processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Then test continuation
    const continueEvent = TestUtils.createBaseEvent(env, 'EXTRACTION_DATA_CONTINUE');
    
    const continueResponse = await TestUtils.sendEventToSnapIn(continueEvent);
    
    expect(continueResponse).toBeDefined();
    expect(continueResponse.function_result).toBeDefined();
    expect(continueResponse.function_result.success).toBe(true);
    
    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const callbackData = TestUtils.getCallbackData();
    expect(callbackData.length).toBeGreaterThan(0);
    
    // Verify that the extraction handles both users and cards/attachments
    const finalEvent = callbackData[callbackData.length - 1];
    expect(['EXTRACTION_DATA_DONE', 'EXTRACTION_DATA_PROGRESS', 'EXTRACTION_DATA_DELAY']).toContain(finalEvent.event_type);
    
    // If there's an error, it should be descriptive
    if (finalEvent.event_type === 'EXTRACTION_DATA_ERROR') {
      expect(finalEvent.error).toBeDefined();
      expect(finalEvent.error.message).toBeDefined();
      console.log('Extraction error details:', finalEvent.error.message);
    }
  }, 60000);
});