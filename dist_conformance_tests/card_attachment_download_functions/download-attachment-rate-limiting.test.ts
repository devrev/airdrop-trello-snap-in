import { createBaseEvent, sendToSnapInServer, startRateLimiting, endRateLimiting } from './test-utils';

describe('download_attachment function - Rate Limiting Test', () => {
  // Define a unique test identifier
  const testName = 'download_attachment_rate_limit_test';
  
  // Clean up after tests
  afterAll(async () => {
    try {
      await endRateLimiting();
      console.log('Rate limiting ended successfully');
    } catch (error) {
      console.error('Failed to end rate limiting:', error);
    }
  });

  test('should handle rate limiting correctly', async () => {
    console.log(`Starting rate limiting test: ${testName}`);
    
    try {
      // Step 1: Start rate limiting
      console.log('Step 1: Starting rate limiting');
      await startRateLimiting(testName);
      
      // Step 2: Prepare the event with valid parameters
      console.log('Step 2: Preparing event with valid parameters');
      const event = createBaseEvent();
      event.input_data.global_values = {
        idCard: '688725db990240b77167efef',
        idAttachment: '68c2be83c413a1889bde83df',
        fileName: 'test-file.txt'
      };
      
      // Step 3: Invoke the function
      console.log('Step 3: Invoking download_attachment function');
      const response = await sendToSnapInServer(event);
      
      // Step 4: Verify the response
      console.log('Step 4: Verifying response');
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.function_result).toBeDefined();
      
      const result = response.function_result;
      
      // Log the actual response for debugging
      console.log('Response details:', {
        success: result.success,
        status_code: result.status_code,
        api_delay: result.api_delay,
        message: result.message
      });
      
      // Verify status code is 429 (rate limit exceeded)
      expect(result.status_code).toBe(429);
      
      // Verify api_delay is greater than 0 and less than or equal to 3
      expect(result.api_delay).toBeGreaterThan(0);
      
      // Check if api_delay is reasonable (less than or equal to 3)
      // If it's larger, it might indicate an issue with api_delay calculation
      expect(result.api_delay).toBeLessThanOrEqual(3);
      
      // Verify the message indicates rate limiting
      expect(result.message).toContain('Rate limit exceeded');
      
      console.log(`Rate limiting test passed with api_delay: ${result.api_delay}`);
      
    } finally {
      // Step 5: End rate limiting
      console.log('Step 5: Ending rate limiting');
      await endRateLimiting();
    }
  });
});