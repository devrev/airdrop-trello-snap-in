import { getTestCredentials, createTestEventPayload, CallbackServer, callSnapInFunction, TestCredentials, startRateLimiting, endRateLimiting } from './test-utils';

describe('fetch_boards function rate limiting acceptance tests', () => {
  let callbackServer: CallbackServer;
  let credentials: TestCredentials;

  beforeAll(async () => {
    // Setup callback server
    callbackServer = new CallbackServer();
    await callbackServer.start();

    // Get test credentials
    try {
      credentials = getTestCredentials();
    } catch (error) {
      throw new Error(`Failed to get test credentials for rate limiting test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  afterAll(async () => {
    // Cleanup callback server
    if (callbackServer) {
      await callbackServer.stop();
    }
  });

  afterEach(async () => {
    // Ensure rate limiting is ended after each test
    await endRateLimiting();
  });

  test('should handle rate limiting correctly with status_code 429 and proper api_delay', async () => {
    const testName = 'fetch_boards_rate_limiting_test';
    
    try {
      // Step 1: Start rate limiting
      console.log(`Starting rate limiting for test: ${testName}`);
      await startRateLimiting(testName);
      console.log('Rate limiting started successfully');

      // Step 2: Invoke fetch_boards function with valid credentials
      const payload = createTestEventPayload('fetch_boards', credentials);
      console.log('Invoking fetch_boards function with rate limiting active');
      
      let response;
      try {
        response = await callSnapInFunction('fetch_boards', payload);
      } catch (error) {
        fail(`Failed to invoke fetch_boards function during rate limiting test: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Verify response structure exists
      if (!response) {
        fail('No response received from fetch_boards function during rate limiting test');
      }

      if (!response.function_result) {
        fail('No function_result in response from fetch_boards function during rate limiting test');
      }

      const result = response.function_result;
      console.log(`Received response with status: ${result.status}, status_code: ${result.status_code}, api_delay: ${result.api_delay}`);

      // Step 3: Verify status_code = 429 (rate limit exceeded)
      if (result.status_code !== 429) {
        fail(`Expected status_code to be 429 (rate limit exceeded) but got ${result.status_code}. ` +
             `This indicates that rate limiting is not working correctly. ` +
             `Response details: status="${result.status}", message="${result.message}", ` +
             `api_delay=${result.api_delay}. ` +
             `Please verify that the rate limiting server at http://localhost:8004 is properly configured ` +
             `and that the fetch_boards function correctly handles rate limiting responses from the Trello API.`);
      }

      // Step 4: Verify api_delay > 0 and <= 3
      if (typeof result.api_delay !== 'number') {
        fail(`Expected api_delay to be a number but got ${typeof result.api_delay} (${result.api_delay}). ` +
             `The api_delay field must be present and numeric when rate limiting occurs. ` +
             `This suggests an issue with rate limit response parsing in the fetch_boards function.`);
      }

      if (result.api_delay <= 0) {
        fail(`Expected api_delay to be greater than 0 but got ${result.api_delay}. ` +
             `When rate limiting occurs (status_code 429), the api_delay should indicate how long to wait ` +
             `before retrying the request. A value of ${result.api_delay} suggests the rate limit response ` +
             `is not being parsed correctly by the fetch_boards function.`);
      }

      if (result.api_delay > 3) {
        fail(`Expected api_delay to be <= 3 seconds but got ${result.api_delay}. ` +
             `This suggests that the api_delay calculation in the fetch_boards function is incorrect. ` +
             `The function should parse the Retry-After header from the rate limiting response and ` +
             `convert it to seconds properly. An api_delay of ${result.api_delay} is too high and ` +
             `indicates a problem with the rate limit response parsing logic.`);
      }

      // Verify the response indicates failure status for rate limiting
      if (result.status !== 'failure') {
        fail(`Expected status to be 'failure' when rate limited but got '${result.status}'. ` +
             `Rate limiting should be treated as a failure condition by the fetch_boards function. ` +
             `Status code: ${result.status_code}, api_delay: ${result.api_delay}`);
      }

      // Verify message indicates rate limiting
      if (!result.message || typeof result.message !== 'string') {
        fail(`Expected a descriptive error message for rate limiting but got: ${result.message}. ` +
             `The fetch_boards function should provide a clear message when rate limiting occurs.`);
      }

      // Log success details for debugging
      console.log(`Rate limiting test passed successfully:`, {
        status_code: result.status_code,
        api_delay: result.api_delay,
        status: result.status,
        message: result.message,
        test_name: testName
      });

    } finally {
      // Step 5: End rate limiting (cleanup)
      console.log('Ending rate limiting');
      await endRateLimiting();
      console.log('Rate limiting ended');
    }
  });

  test('should verify rate limiting cleanup works correctly', async () => {
    const testName = 'fetch_boards_rate_limiting_cleanup_test';
    
    // Start and immediately end rate limiting to test cleanup
    try {
      console.log(`Testing rate limiting cleanup with test: ${testName}`);
      await startRateLimiting(testName);
      console.log('Rate limiting started for cleanup test');
      
      await endRateLimiting();
      console.log('Rate limiting ended for cleanup test');
      
      // Now try a normal request - should not be rate limited
      const payload = createTestEventPayload('fetch_boards', credentials);
      console.log('Invoking fetch_boards function after rate limiting cleanup');
      
      let response;
      try {
        response = await callSnapInFunction('fetch_boards', payload);
      } catch (error) {
        fail(`Failed to invoke fetch_boards function after rate limiting cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const result = response.function_result;
      console.log(`Response after cleanup: status_code=${result.status_code}, status=${result.status}`);

      // Should not be rate limited anymore
      if (result.status_code === 429) {
        fail(`Rate limiting cleanup failed - still receiving status_code 429 after ending rate limiting. ` +
             `This indicates that the rate limiting server at http://localhost:8004 is not properly ` +
             `clearing the rate limit state when /end_rate_limiting is called. ` +
             `Response details: status="${result.status}", message="${result.message}", api_delay=${result.api_delay}`);
      }

      // Should be either success (200) or some other non-rate-limit error
      if (result.status_code !== 200 && result.status_code !== 401 && result.status_code !== 403) {
        console.warn(`Unexpected status_code after rate limiting cleanup: ${result.status_code}. ` +
                    `Expected 200 (success), 401 (auth error), or 403 (permission error), but got ${result.status_code}. ` +
                    `Message: ${result.message}`);
      }

      console.log('Rate limiting cleanup test completed successfully');
      
    } catch (error) {
      fail(`Rate limiting cleanup test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
});