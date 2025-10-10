import { getTestEnvironment, createCallbackServer, createBaseExtractionEvent, callSnapInFunction } from './test-utils';
import * as http from 'http';

describe('Extraction Integration Tests', () => {
  let callbackServer: http.Server;
  let env: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    env = getTestEnvironment();
    const { server } = await createCallbackServer();
    callbackServer = server;
  });

  afterAll(async () => {
    if (callbackServer) {
      callbackServer.close();
    }
  });

  test('should extract cards and attachments data successfully', async () => {
    // Create extraction event for data extraction
    const event = createBaseExtractionEvent(env, 'EXTRACTION_DATA_START');
    
    try {
      // Call the extraction function
      const result = await callSnapInFunction('extraction', event);
      
      // Verify the function executed successfully
      expect(result.function_result).toBeDefined();
      expect(result.function_result.success).toBe(true);
      expect(result.function_result.message).toContain('Data extraction initiated successfully');
      
      // Verify no errors occurred
      expect(result.error).toBeUndefined();
      
      console.log('Full extraction integration test completed successfully');
      console.log('Extraction result:', JSON.stringify(result.function_result, null, 2));
      
    } catch (error) {
      fail(`Extraction integration test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, 90000);

  test('should handle extraction continuation correctly', async () => {
    // Create extraction event for data continuation
    const event = createBaseExtractionEvent(env, 'EXTRACTION_DATA_CONTINUE');
    
    try {
      // Call the extraction function
      const result = await callSnapInFunction('extraction', event);
      
      // Verify the function executed successfully
      expect(result.function_result).toBeDefined();
      expect(result.function_result.success).toBe(true);
      expect(result.function_result.message).toContain('Data extraction initiated successfully');
      
      // Verify no errors occurred
      expect(result.error).toBeUndefined();
      
      console.log('Extraction continuation test completed successfully');
      
    } catch (error) {
      fail(`Extraction continuation test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, 90000);
});