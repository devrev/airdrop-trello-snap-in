import { TestUtils, CallbackServerSetup } from './test-utils';

describe('check_authentication function conformance tests', () => {
  let callbackServer: CallbackServerSetup;

  beforeAll(async () => {
    // Set up callback server for testing
    callbackServer = await TestUtils.setupCallbackServer();
  });

  afterAll(async () => {
    // Clean up callback server
    if (callbackServer?.server) {
      await TestUtils.closeServer(callbackServer.server);
    }
  });

  describe('Trivial: Basic function invocation', () => {
    test('should invoke check_authentication function and return expected response structure', async () => {
      // Create basic test event
      const event = TestUtils.createBaseEvent('check_authentication', 'authentication_check');

      // Send event to snap-in server
      const response = await TestUtils.sendEventToSnapIn(event);

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(typeof response.function_result).toBe('object');
      
      // Verify required fields exist
      expect(response.function_result).toHaveProperty('authenticated');
      expect(response.function_result).toHaveProperty('status_code');
      expect(response.function_result).toHaveProperty('api_delay');
      expect(response.function_result).toHaveProperty('message');
      expect(response.function_result).toHaveProperty('raw_response');
      
      // Verify field types
      expect(typeof response.function_result.authenticated).toBe('boolean');
      expect(typeof response.function_result.status_code).toBe('number');
      expect(typeof response.function_result.api_delay).toBe('number');
      expect(typeof response.function_result.message).toBe('string');
    }, 30000);
  });

  describe('Simple: Successful authentication', () => {
    test('should successfully authenticate with valid credentials', async () => {
      // Ensure environment variables are available
      const env = TestUtils.getEnvironment();
      expect(env.TRELLO_API_KEY).toBeTruthy();
      expect(env.TRELLO_TOKEN).toBeTruthy();

      // Create test event with valid credentials
      const event = TestUtils.createBaseEvent('check_authentication', 'authentication_check');

      // Send event to snap-in server
      const response = await TestUtils.sendEventToSnapIn(event);

      // Verify successful authentication
      expect(response.function_result.authenticated).toBe(true);
      expect(response.function_result.status_code).toBe(200);
      expect(response.function_result.api_delay).toBe(0);
      expect(response.function_result.message).toContain('Authentication successful');
      expect(response.function_result.member_info).toBeDefined();
      expect(response.function_result.raw_response).toBeDefined();
    }, 30000);
  });

  describe('Complex: Authentication failure scenarios', () => {
    test('should handle invalid API credentials gracefully', async () => {
      // Create event with invalid credentials
      const event = TestUtils.createBaseEvent('check_authentication', 'authentication_check');
      event.payload.connection_data.key = 'key=invalid_key&token=invalid_token';

      // Send event to snap-in server
      const response = await TestUtils.sendEventToSnapIn(event);

      // Verify authentication failure
      expect(response.function_result.authenticated).toBe(false);
      expect(response.function_result.status_code).toBeGreaterThanOrEqual(400);
      expect(response.function_result.message).toContain('Authentication failed');
      expect(response.function_result.member_info).toBeUndefined();
    }, 30000);

    test('should handle missing connection data', async () => {
      // Create event without connection data
      const event = TestUtils.createBaseEvent('check_authentication', 'authentication_check');
      delete event.payload.connection_data;

      // Send event to snap-in server
      const response = await TestUtils.sendEventToSnapIn(event);

      // Verify proper error handling
      expect(response.function_result.authenticated).toBe(false);
      expect(response.function_result.status_code).toBe(0);
      expect(response.function_result.message).toContain('Missing connection data');
    }, 30000);

    test('should handle malformed connection key', async () => {
      // Create event with malformed connection key
      const event = TestUtils.createBaseEvent('check_authentication', 'authentication_check');
      event.payload.connection_data.key = 'invalid_format';

      // Send event to snap-in server
      const response = await TestUtils.sendEventToSnapIn(event);

      // Verify proper error handling
      expect(response.function_result.authenticated).toBe(false);
      expect(response.function_result.status_code).toBe(0);
      expect(response.function_result.message).toContain('Invalid connection key format');
    }, 30000);

    test('should handle rate limiting with proper delay', async () => {
      // This test simulates rate limiting scenario
      // Note: This may not trigger actual rate limiting but tests the structure
      const event = TestUtils.createBaseEvent('check_authentication', 'authentication_check');

      // Send event to snap-in server
      const response = await TestUtils.sendEventToSnapIn(event);

      // Verify api_delay field is properly handled
      expect(typeof response.function_result.api_delay).toBe('number');
      expect(response.function_result.api_delay).toBeGreaterThanOrEqual(0);
      
      // If rate limited, should have appropriate message and delay
      if (response.function_result.status_code === 429) {
        expect(response.function_result.message).toContain('Rate limit');
        expect(response.function_result.api_delay).toBeGreaterThan(0);
      }
    }, 30000);

    test('should handle rate limiting with proper api_delay calculation', async () => {
      const testName = `rate_limit_test_${Date.now()}`;
      
      try {
        // Start rate limiting on the API server
        await TestUtils.startRateLimiting(testName);
        
        // Create test event with valid credentials
        const event = TestUtils.createBaseEvent('check_authentication', 'authentication_check');
        
        // Invoke the check_authentication function
        const response = await TestUtils.sendEventToSnapIn(event);
        
        // Verify response structure exists
        expect(response).toBeDefined();
        expect(response.function_result).toBeDefined();
        
        // Verify rate limiting response
        expect(response.function_result.status_code).toBe(429);
        expect(response.function_result.authenticated).toBe(false);
        
        // Verify api_delay is properly calculated
        expect(response.function_result.api_delay).toBeGreaterThan(0);
        expect(response.function_result.api_delay).toBeLessThanOrEqual(3);
        
        // Verify rate limiting message
        expect(response.function_result.message).toContain('Rate limit');
        
        // Log response for debugging
        console.log('Rate limiting test response:', {
          status_code: response.function_result.status_code,
          api_delay: response.function_result.api_delay,
          message: response.function_result.message,
          authenticated: response.function_result.authenticated
        });
        
      } catch (error) {
        throw new Error(`Rate limiting test failed: ${error instanceof Error ? error.message : String(error)}. Test name: ${testName}`);
      } finally {
        // Always end rate limiting to clean up
        try {
          await TestUtils.endRateLimiting();
        } catch (cleanupError) {
          console.warn(`Failed to clean up rate limiting: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
        }
      }
    }, 30000);
  });
});