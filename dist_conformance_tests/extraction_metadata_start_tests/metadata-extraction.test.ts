import { TestUtils } from './test-utils';

describe('Metadata Extraction Tests', () => {
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

  test('should handle metadata extraction event successfully', async () => {
    // Create metadata extraction event
    const event = TestUtils.createMetadataExtractionEvent(env);

    // Send event to snap-in
    const response = await TestUtils.sendEventToSnapIn(event);

    // Verify response structure
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();

    // Wait for callback with metadata done event
    const callbacks = await TestUtils.waitForCallback(15000);

    // Verify callback was received
    expect(callbacks).toHaveLength(1);
    const callback = callbacks[0];

    // Verify callback contains expected metadata done event
    expect(callback.event_type).toBe('EXTRACTION_METADATA_DONE');
    expect(callback.error).toBeUndefined();
    expect(callback.timestamp).toBeDefined();

    console.log('Metadata extraction test completed successfully:', {
      response_received: !!response,
      callback_received: !!callback,
      event_type: callback.event_type,
      timestamp: callback.timestamp,
    });
  }, 30000);

  test('should complete metadata extraction workflow within timeout', async () => {
    const startTime = Date.now();
    
    // Create metadata extraction event
    const event = TestUtils.createMetadataExtractionEvent(env);

    // Send event to snap-in
    const response = await TestUtils.sendEventToSnapIn(event);
    expect(response).toBeDefined();

    // Wait for callback
    const callbacks = await TestUtils.waitForCallback(20000);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify workflow completed successfully
    expect(callbacks).toHaveLength(1);
    expect(callbacks[0].event_type).toBe('EXTRACTION_METADATA_DONE');
    
    // Verify it completed within reasonable time (less than 25 seconds)
    expect(duration).toBeLessThan(25000);

    console.log('Metadata extraction workflow timing test completed:', {
      duration_ms: duration,
      event_type: callbacks[0].event_type,
      success: true,
    });
  }, 30000);
});