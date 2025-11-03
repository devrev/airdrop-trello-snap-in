import { getTestCredentials, createAuthCheckEventPayload, callSnapInFunction, startRateLimiting, endRateLimiting } from './test-utils';

describe('check_authentication function rate limiting', () => {
  let testCredentials: ReturnType<typeof getTestCredentials>;

  beforeAll(() => {
    try {
      testCredentials = getTestCredentials();
    } catch (error) {
      throw new Error(`Failed to load test credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  afterEach(async () => {
    // Ensure rate limiting is ended after each test to avoid affecting other tests
    try {
      await endRateLimiting();
    } catch (error) {
      console.warn('Failed to end rate limiting in afterEach:', error instanceof Error ? error.message : 'Unknown error');
    }
  });

  describe('Rate Limiting: API delay handling', () => {
    it('should handle rate limiting with proper api_delay calculation', async () => {
      const testName = 'check_authentication_rate_limiting_test';
      
      try {
        // Start rate limiting
        await startRateLimiting(testName);
        
        // Create valid connection data
        const validConnectionData = `key=${testCredentials.apiKey}&token=${testCredentials.token}`;
        const eventPayload = createAuthCheckEventPayload(validConnectionData);

        // Call the function and expect rate limiting
        const result = await callSnapInFunction(eventPayload);

        // Verify the result structure exists
        expect(result).toBeDefined();
        expect(result.function_result).toBeDefined();
        
        // Verify rate limiting response
        expect(result.function_result.status_code).toBe(429);
        if (result.function_result.status_code !== 429) {
          throw new Error(`Expected status_code to be 429 (rate limited), but got ${result.function_result.status_code}. This indicates rate limiting was not properly triggered or handled.`);
        }

        // Verify api_delay is present and within expected range
        expect(result.function_result.api_delay).toBeDefined();
        expect(typeof result.function_result.api_delay).toBe('number');
        
        if (typeof result.function_result.api_delay !== 'number') {
          throw new Error(`Expected api_delay to be a number, but got ${typeof result.function_result.api_delay}. Value: ${result.function_result.api_delay}`);
        }

        expect(result.function_result.api_delay).toBeGreaterThan(0);
        if (result.function_result.api_delay <= 0) {
          throw new Error(`Expected api_delay to be greater than 0, but got ${result.function_result.api_delay}. This indicates the rate limiting delay was not properly calculated.`);
        }

        expect(result.function_result.api_delay).toBeLessThanOrEqual(3);
        if (result.function_result.api_delay > 3) {
          throw new Error(`Expected api_delay to be <= 3 seconds, but got ${result.function_result.api_delay}. This suggests the api_delay calculation in the implementation code may be incorrect.`);
        }

        // Verify other required fields are present
        expect(result.function_result.message).toBeDefined();
        expect(typeof result.function_result.message).toBe('string');
        expect(result.function_result.message.length).toBeGreaterThan(0);
        
        expect(result.function_result.timestamp).toBeDefined();
        expect(typeof result.function_result.timestamp).toBe('string');

        // Verify status reflects the rate limiting
        expect(result.function_result.status).toBeDefined();
        if (result.function_result.status === 'success') {
          throw new Error(`Expected status to indicate failure due to rate limiting, but got 'success'. Status code: ${result.function_result.status_code}, Message: ${result.function_result.message}`);
        }

      } catch (error) {
        // Ensure we end rate limiting even if test fails
        try {
          await endRateLimiting();
        } catch (endError) {
          console.warn('Failed to end rate limiting after test error:', endError instanceof Error ? endError.message : 'Unknown error');
        }
        
        if (error instanceof Error) {
          throw new Error(`Rate limiting test failed: ${error.message}`);
        }
        throw error;
      } finally {
        // End rate limiting
        await endRateLimiting();
      }
    }, 45000); // Extended timeout for rate limiting test
  });
});