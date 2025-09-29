import { getTestEnvironment, createTestEvent, setupCallbackServer, sendEventToSnapIn, CallbackServerSetup, startRateLimiting, endRateLimiting } from './test-utils';

describe('check_authentication function conformance tests', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer?.server) {
      callbackServer.server.close();
    }
  });

  describe('Trivial: Basic function invocation', () => {
    it('should return proper response structure when invoked', async () => {
      const connectionKey = `key=${testEnv.trelloApiKey}&token=${testEnv.trelloToken}`;
      const event = createTestEvent(connectionKey, testEnv.trelloOrgId);

      const response = await sendEventToSnapIn(event);

      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(typeof response.function_result.authenticated).toBe('boolean');
      expect(typeof response.function_result.status_code).toBe('number');
      expect(typeof response.function_result.api_delay).toBe('number');
      expect(typeof response.function_result.message).toBe('string');
      expect(response.error).toBeUndefined();
    }, 30000);
  });

  describe('Simple: Invalid credentials handling', () => {
    it('should handle missing connection data gracefully', async () => {
      const event = createTestEvent('', testEnv.trelloOrgId);
      event.payload.connection_data.key = '';

      const response = await sendEventToSnapIn(event);

      expect(response.function_result.authenticated).toBe(false);
      expect(response.function_result.status_code).toBe(0);
      expect(response.function_result.api_delay).toBe(0);
      expect(response.function_result.message).toContain('Missing connection data');
      expect(response.error).toBeUndefined();
    }, 30000);

    it('should handle malformed credentials gracefully', async () => {
      const connectionKey = 'invalid-format-credentials';
      const event = createTestEvent(connectionKey, testEnv.trelloOrgId);

      const response = await sendEventToSnapIn(event);

      expect(response.function_result.authenticated).toBe(false);
      expect(response.function_result.status_code).toBe(0);
      expect(response.function_result.api_delay).toBe(0);
      expect(response.function_result.message).toContain('Invalid connection data');
      expect(response.error).toBeUndefined();
    }, 30000);

    it('should handle invalid API credentials', async () => {
      const connectionKey = 'key=invalid_key&token=invalid_token';
      const event = createTestEvent(connectionKey, testEnv.trelloOrgId);

      const response = await sendEventToSnapIn(event);

      expect(response.function_result.authenticated).toBe(false);
      expect(response.function_result.status_code).toBeGreaterThan(0);
      expect(response.function_result.api_delay).toBeGreaterThanOrEqual(0);
      expect(response.function_result.message).toBeDefined();
      expect(response.error).toBeUndefined();
    }, 30000);
  });

  describe('Complex: Valid authentication flow', () => {
    it('should successfully authenticate with valid Trello credentials', async () => {
      const connectionKey = `key=${testEnv.trelloApiKey}&token=${testEnv.trelloToken}`;
      const event = createTestEvent(connectionKey, testEnv.trelloOrgId);

      const response = await sendEventToSnapIn(event);

      expect(response.function_result.authenticated).toBe(true);
      expect(response.function_result.status_code).toBe(200);
      expect(response.function_result.api_delay).toBe(0);
      expect(response.function_result.message).toContain('Successfully authenticated');
      expect(response.error).toBeUndefined();
    }, 30000);

    it('should handle rate limiting appropriately', async () => {
      const connectionKey = `key=${testEnv.trelloApiKey}&token=${testEnv.trelloToken}`;
      const event = createTestEvent(connectionKey, testEnv.trelloOrgId);

      // Make multiple rapid requests to potentially trigger rate limiting
      const promises = Array(3).fill(null).map(() => sendEventToSnapIn(event));
      const responses = await Promise.all(promises);

      // At least one should succeed
      const successfulResponses = responses.filter(r => r.function_result.authenticated === true);
      expect(successfulResponses.length).toBeGreaterThan(0);

      // Check if any response indicates rate limiting
      const rateLimitedResponses = responses.filter(r => 
        r.function_result.status_code === 429 || r.function_result.api_delay > 0
      );

      if (rateLimitedResponses.length > 0) {
        rateLimitedResponses.forEach(response => {
          expect(response.function_result.api_delay).toBeGreaterThan(0);
          expect(response.function_result.message).toContain('Rate limit');
        });
      }
    }, 45000);

    it('should handle API rate limiting with controlled rate limit activation', async () => {
      const testName = 'check_authentication_rate_limit_test';
      let rateLimitingStarted = false;
      
      try {
        // Step 1: Start rate limiting
        console.log(`Starting rate limiting for test: ${testName}`);
        await startRateLimiting(testName);
        rateLimitingStarted = true;
        console.log('Rate limiting started successfully');

        // Step 2: Invoke the function with valid credentials
        const connectionKey = `key=${testEnv.trelloApiKey}&token=${testEnv.trelloToken}`;
        const event = createTestEvent(connectionKey, testEnv.trelloOrgId);
        
        console.log('Invoking check_authentication function with valid credentials');
        const response = await sendEventToSnapIn(event);
        
        console.log('Function response received:', {
          authenticated: response.function_result?.authenticated,
          status_code: response.function_result?.status_code,
          api_delay: response.function_result?.api_delay,
          message: response.function_result?.message
        });

        // Step 3: Verify rate limiting response
        expect(response.function_result).toBeDefined();
        expect(response.function_result.status_code).toBe(429);
        expect(response.function_result.api_delay).toBeGreaterThan(0);
        expect(response.function_result.api_delay).toBeLessThanOrEqual(3);
        expect(response.function_result.authenticated).toBe(false);
        expect(response.function_result.message).toBeDefined();
        expect(response.error).toBeUndefined();

        // Additional validation with descriptive error messages
        if (response.function_result.status_code !== 429) {
          throw new Error(`Expected status_code to be 429 (rate limited), but got ${response.function_result.status_code}. This indicates that rate limiting was not properly applied or detected.`);
        }

        if (response.function_result.api_delay <= 0) {
          throw new Error(`Expected api_delay to be greater than 0, but got ${response.function_result.api_delay}. This indicates that the rate limiting delay calculation is incorrect.`);
        }

        if (response.function_result.api_delay > 3) {
          throw new Error(`Expected api_delay to be <= 3 seconds, but got ${response.function_result.api_delay}. This suggests an issue with api_delay calculation in the implementation code.`);
        }

        console.log('Rate limiting test completed successfully');

      } catch (error) {
        console.error('Rate limiting test failed:', error);
        throw error;
      } finally {
        // Step 4: Always end rate limiting, even if test fails
        if (rateLimitingStarted) {
          try {
            console.log('Ending rate limiting');
            await endRateLimiting();
            console.log('Rate limiting ended successfully');
          } catch (cleanupError) {
            console.error('Failed to end rate limiting during cleanup:', cleanupError);
            // Don't throw cleanup errors, but log them
          }
        }
      }
    }, 45000);
  });
});