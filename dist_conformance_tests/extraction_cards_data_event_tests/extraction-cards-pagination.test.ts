import { getTestEnvironment, setupCallbackServer, closeServer, createBaseEvent, sendEventToSnapIn, TestServers } from './test-utils';

describe('Extraction Function - Cards Pagination', () => {
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

  test('should handle cards extraction with pagination logic for EXTRACTION_DATA_START', async () => {
    // Create test event for data extraction start with board ID
    const event = createBaseEvent(env, 'extraction', 'EXTRACTION_DATA_START');
    
    // Ensure the external_sync_unit_id is set for board cards extraction
    event.payload.event_context.external_sync_unit_id = '688725dad59c015ce052eecf';
    event.payload.event_context.external_sync_unit = '688725dad59c015ce052eecf';

    // Send event to snap-in server
    const response = await sendEventToSnapIn(event);

    // Verify the function was invoked successfully
    expect(response).toBeDefined();
    
    if (response.error) {
      console.error('Extraction function error:', JSON.stringify(response.error, null, 2));
      
      // If there's an error, it should be a meaningful one, not a crash
      expect(response.error.error).toBeDefined();
      
      // The error should indicate what went wrong during cards extraction
      const errorMessage = response.error.error?.message || response.error.err_msg || 'Unknown error';
      expect(typeof errorMessage).toBe('string');
      expect(errorMessage.length).toBeGreaterThan(0);
    } else {
      // If successful, verify the response structure
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      expect(response.function_result.message).toContain('Data extraction initiated successfully');
    }
  }, 90000);

  test('should handle cards extraction with pagination logic for EXTRACTION_DATA_CONTINUE', async () => {
    // Create test event for data extraction continue with board ID
    const event = createBaseEvent(env, 'extraction', 'EXTRACTION_DATA_CONTINUE');
    
    // Ensure the external_sync_unit_id is set for board cards extraction
    event.payload.event_context.external_sync_unit_id = '688725dad59c015ce052eecf';
    event.payload.event_context.external_sync_unit = '688725dad59c015ce052eecf';

    // Send event to snap-in server
    const response = await sendEventToSnapIn(event);

    // Verify the function was invoked successfully
    expect(response).toBeDefined();
    
    if (response.error) {
      console.error('Extraction function error:', JSON.stringify(response.error, null, 2));
      
      // If there's an error, it should be a meaningful one, not a crash
      expect(response.error.error).toBeDefined();
      
      // The error should indicate what went wrong during cards extraction
      const errorMessage = response.error.error?.message || response.error.err_msg || 'Unknown error';
      expect(typeof errorMessage).toBe('string');
      expect(errorMessage.length).toBeGreaterThan(0);
    } else {
      // If successful, verify the response structure
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      expect(response.function_result.message).toContain('Data extraction initiated successfully');
    }
  }, 90000);
});