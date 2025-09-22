import { loadTestEvent, sendToSnapInServer, toggleRateLimiting, closeAllHandles } from './utils';

// Ensure all connections are closed before tests
beforeAll(async () => {
  await closeAllHandles();
});

// Ensure all connections are closed after tests
afterAll(async () => {
  // Make sure rate limiting is turned off after tests
  await toggleRateLimiting('end', 'fetch_boards_rate_limit_test').catch(err => {
    console.warn('Failed to end rate limiting, but continuing cleanup:', err.message);
  });
  
  await closeAllHandles();
  jest.clearAllTimers();
});

describe('fetch_boards rate limiting tests', () => {
  const TEST_NAME = 'fetch_boards_rate_limit_test';
  
  // Test: Verify the function handles rate limiting correctly
  test('should handle rate limiting correctly', async () => {
    try {
      // Step 1: Start rate limiting
      await toggleRateLimiting('start', TEST_NAME);
      console.log('Rate limiting started successfully');
      
      // Step 2: Invoke the fetch_boards function
      const event = loadTestEvent('fetch_boards');
      const response = await sendToSnapInServer(event);
      
      // Step 3: Verify the response
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.function_result).toBeDefined();
      
      // Step 4: Verify status code is 429 (rate limited)
      expect(response.function_result.status_code).toBe(429);
      if (response.function_result.status_code !== 429) {
        console.error(`Expected status code 429 (rate limited), but got ${response.function_result.status_code}. Rate limiting may not be working correctly.`);
      }
      
      // Step 5: Verify api_delay is greater than 0 and less than or equal to 3
      expect(response.function_result.api_delay).toBeGreaterThan(0);
      if (response.function_result.api_delay <= 0) {
        console.error(`Expected api_delay to be greater than 0, but got ${response.function_result.api_delay}. The function may not be calculating api_delay correctly.`);
      }
      
      expect(response.function_result.api_delay).toBeLessThanOrEqual(3);
      if (response.function_result.api_delay > 3) {
        console.error(`Expected api_delay to be less than or equal to 3, but got ${response.function_result.api_delay}. The function may not be calculating api_delay correctly.`);
      }
      
      // Step 6: Verify the message indicates rate limiting
      expect(response.function_result.message).toContain('Rate limit');
      if (!response.function_result.message.includes('Rate limit')) {
        console.error(`Expected message to contain 'Rate limit', but got: ${response.function_result.message}`);
      }
      
      // Step 7: Verify raw_response is present
      expect(response.function_result.raw_response).toBeDefined();
      if (!response.function_result.raw_response) {
        console.error('Expected raw_response to be defined, but it was not.');
      }
      
      // Log success for clarity
      console.log(`Rate limiting test passed with api_delay: ${response.function_result.api_delay}`);
    } finally {
      // Step 8: End rate limiting (in finally block to ensure it runs even if test fails)
      await toggleRateLimiting('end', TEST_NAME);
      console.log('Rate limiting ended successfully');
    }
  });
});