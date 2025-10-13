import { getTestEnvironment, createBaseTestEvent, setupCallbackServer, sendEventToSnapIn, CallbackServerSetup, startRateLimiting, endRateLimiting } from './test-utils';

describe('fetch_organization_members function - rate limiting', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: ReturnType<typeof getTestEnvironment>;
  const testName = 'fetch_organization_members_rate_limiting_test';

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    // Ensure rate limiting is ended even if test fails
    await endRateLimiting();
    
    if (callbackServer?.server) {
      callbackServer.server.close();
    }
  });

  afterEach(async () => {
    // Cleanup after each test
    await endRateLimiting();
  });

  test('should handle rate limiting correctly with 429 status and appropriate api_delay', async () => {
    const startTime = Date.now();
    
    try {
      // Step 1: Start rate limiting
      console.log('Starting rate limiting for test:', testName);
      await startRateLimiting(testName);
      
      // Step 2: Create valid event with all required parameters
      const event = createBaseTestEvent(testEnv);
      
      console.log('Invoking fetch_organization_members function with rate limiting active:', {
        organization_id: testEnv.trelloOrganizationId,
        test_name: testName,
        timestamp: new Date().toISOString(),
      });
      
      // Step 3: Invoke the function
      const response = await sendEventToSnapIn(event);
      const endTime = Date.now();
      const totalTestTime = (endTime - startTime) / 1000;
      
      // Step 4: Validate response structure
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      
      console.log('Rate limiting test response:', {
        status: response.function_result.status,
        status_code: response.function_result.status_code,
        api_delay: response.function_result.api_delay,
        message: response.function_result.message,
        total_test_time_seconds: totalTestTime,
        timestamp: new Date().toISOString(),
      });
      
      // Step 5: Assert rate limiting behavior
      if (response.function_result.status_code !== 429) {
        console.error('Rate limiting test failed - unexpected status code:', {
          expected_status_code: 429,
          actual_status_code: response.function_result.status_code,
          response_status: response.function_result.status,
          response_message: response.function_result.message,
          test_name: testName,
          organization_id: testEnv.trelloOrganizationId,
          timestamp: new Date().toISOString(),
        });
        fail(`Expected status_code to be 429 (rate limited), but got ${response.function_result.status_code}. This indicates that rate limiting was not properly triggered or handled.`);
      }
      
      expect(response.function_result.status_code).toBe(429);
      
      // Validate api_delay
      const apiDelay = response.function_result.api_delay;
      expect(apiDelay).toBeDefined();
      expect(typeof apiDelay).toBe('number');
      
      if (apiDelay <= 0) {
        console.error('Rate limiting test failed - api_delay should be positive:', {
          api_delay: apiDelay,
          status_code: response.function_result.status_code,
          message: response.function_result.message,
          test_name: testName,
          timestamp: new Date().toISOString(),
        });
        fail(`Expected api_delay to be greater than 0, but got ${apiDelay}. Rate limited responses should include a positive delay value.`);
      }
      
      if (apiDelay > 3) {
        console.error('Rate limiting test failed - api_delay calculation may be incorrect:', {
          api_delay: apiDelay,
          expected_max: 3,
          status_code: response.function_result.status_code,
          message: response.function_result.message,
          test_name: testName,
          timestamp: new Date().toISOString(),
        });
        fail(`Expected api_delay to be <= 3 seconds, but got ${apiDelay}. This suggests the api_delay calculation in the implementation may be incorrect.`);
      }
      
      expect(apiDelay).toBeGreaterThan(0);
      expect(apiDelay).toBeLessThanOrEqual(3);
      
      // Validate that the response indicates failure due to rate limiting
      expect(response.function_result.status).toBe('failure');
      expect(response.function_result.message).toBeDefined();
      expect(typeof response.function_result.message).toBe('string');
      
      console.log('Rate limiting test passed successfully:', {
        status_code: response.function_result.status_code,
        api_delay: apiDelay,
        status: response.function_result.status,
        message: response.function_result.message,
        test_name: testName,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error) {
      console.error('Rate limiting test encountered an error:', {
        error_message: error instanceof Error ? error.message : error,
        error_stack: error instanceof Error ? error.stack : undefined,
        test_name: testName,
        organization_id: testEnv.trelloOrganizationId,
        timestamp: new Date().toISOString(),
      });
      throw error;
    } finally {
      // Step 6: Always end rate limiting
      console.log('Ending rate limiting for test:', testName);
      await endRateLimiting();
    }
  });

  test('should handle rate limiting setup failures gracefully', async () => {
    // Test what happens if rate limiting setup fails
    const invalidTestName = '';
    
    try {
      await startRateLimiting(invalidTestName);
      fail('Expected startRateLimiting to throw an error with invalid test name');
    } catch (error) {
      expect(error).toBeDefined();
      console.log('Rate limiting setup failure handled correctly:', {
        error_message: error instanceof Error ? error.message : error,
        invalid_test_name: invalidTestName,
        timestamp: new Date().toISOString(),
      });
    }
  });
});