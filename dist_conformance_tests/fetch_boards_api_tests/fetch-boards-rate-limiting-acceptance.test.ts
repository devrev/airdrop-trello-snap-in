import axios from 'axios';
import {
  getTestEnvironment,
  createTestEvent,
  setupCallbackServer,
  sendEventToSnapIn,
  teardownCallbackServer,
  CallbackServerSetup,
  TestEnvironment,
} from './test-utils';

describe('fetch_boards function rate limiting acceptance tests', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: TestEnvironment;
  const testIdentifier = 'fetch_boards_rate_limiting_test';

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    await teardownCallbackServer(callbackServer);
  });

  afterEach(async () => {
    // Ensure rate limiting is ended after each test
    try {
      await axios.post('http://localhost:8004/end_rate_limiting', {}, {
        timeout: 5000,
      });
    } catch (error) {
      // Ignore errors in cleanup
      console.warn('Warning: Failed to end rate limiting in cleanup:', error);
    }
  });

  describe('Acceptance: Rate limiting behavior', () => {
    it('should handle rate limiting correctly with status_code 429 and appropriate api_delay', async () => {
      let rateLimitingStarted = false;
      let rateLimitingEnded = false;

      try {
        // Step 1: Start rate limiting
        console.log(`Starting rate limiting for test: ${testIdentifier}`);
        const startRateLimitingResponse = await axios.post(
          'http://localhost:8004/start_rate_limiting',
          { test_name: testIdentifier },
          { timeout: 10000 }
        );
        
        if (startRateLimitingResponse.status !== 200) {
          throw new Error(
            `Failed to start rate limiting. Expected status 200, got ${startRateLimitingResponse.status}. ` +
            `Response: ${JSON.stringify(startRateLimitingResponse.data)}`
          );
        }
        
        rateLimitingStarted = true;
        console.log('Rate limiting started successfully');

        // Step 2: Invoke fetch_boards function with valid credentials
        const event = createTestEvent('fetch_boards', testEnv);
        console.log('Invoking fetch_boards function with rate limiting active');
        
        const response = await sendEventToSnapIn(event);

        // Step 3: Verify response structure exists
        if (!response) {
          throw new Error(
            'No response received from snap-in server. Expected response with function_result containing ' +
            'status_code, api_delay, and message fields.'
          );
        }

        if (!response.function_result) {
          throw new Error(
            `Response missing function_result field. Received response: ${JSON.stringify(response)}. ` +
            'Expected response.function_result to contain status_code, api_delay, and message fields.'
          );
        }

        const { status_code, api_delay, message } = response.function_result;

        // Step 4: Verify status_code = 429
        if (status_code !== 429) {
          throw new Error(
            `Expected status_code to be 429 (rate limited) but got ${status_code}. ` +
            `Full response: ${JSON.stringify(response.function_result)}. ` +
            `This indicates that either: ` +
            `1) Rate limiting was not properly activated on the API server, ` +
            `2) The function is not correctly handling the 429 response from the API, or ` +
            `3) The API server is not returning the expected rate limit response. ` +
            `Test identifier used: ${testIdentifier}`
          );
        }

        // Step 5: Verify api_delay is a number
        if (typeof api_delay !== 'number') {
          throw new Error(
            `Expected api_delay to be a number but got ${typeof api_delay} with value: ${api_delay}. ` +
            `Full response: ${JSON.stringify(response.function_result)}. ` +
            'The api_delay field should contain the number of seconds to wait before retrying the request.'
          );
        }

        // Step 6: Verify api_delay > 0 and <= 3
        if (api_delay <= 0) {
          throw new Error(
            `Expected api_delay to be greater than 0 but got ${api_delay}. ` +
            `Full response: ${JSON.stringify(response.function_result)}. ` +
            'When rate limited, api_delay should indicate the number of seconds to wait before retrying. ' +
            'A value of 0 or negative indicates the rate limiting delay was not properly calculated.'
          );
        }

        if (api_delay > 3) {
          throw new Error(
            `Expected api_delay to be <= 3 seconds but got ${api_delay}. ` +
            `Full response: ${JSON.stringify(response.function_result)}. ` +
            'An api_delay greater than 3 seconds suggests that the delay calculation in the implementation ' +
            'is not working correctly. The implementation should parse the Retry-After header from the API ' +
            'response and calculate the appropriate delay.'
          );
        }

        // Step 7: Verify message indicates rate limiting
        if (!message || typeof message !== 'string') {
          throw new Error(
            `Expected message to be a non-empty string but got: ${message}. ` +
            `Full response: ${JSON.stringify(response.function_result)}. ` +
            'The message field should contain information about the rate limiting.'
          );
        }

        console.log(
          `Rate limiting test successful: status_code=${status_code}, api_delay=${api_delay}, message="${message}"`
        );

        // Step 8: End rate limiting
        console.log('Ending rate limiting');
        const endRateLimitingResponse = await axios.post(
          'http://localhost:8004/end_rate_limiting',
          {},
          { timeout: 10000 }
        );
        
        if (endRateLimitingResponse.status !== 200) {
          console.warn(
            `Warning: Failed to end rate limiting properly. Status: ${endRateLimitingResponse.status}, ` +
            `Response: ${JSON.stringify(endRateLimitingResponse.data)}`
          );
        } else {
          console.log('Rate limiting ended successfully');
        }
        
        rateLimitingEnded = true;

      } catch (error) {
        // Ensure we try to end rate limiting even if test fails
        if (rateLimitingStarted && !rateLimitingEnded) {
          try {
            console.log('Attempting to end rate limiting due to test failure');
            await axios.post('http://localhost:8004/end_rate_limiting', {}, { timeout: 5000 });
            console.log('Rate limiting ended after test failure');
          } catch (cleanupError) {
            console.error('Failed to end rate limiting during error cleanup:', cleanupError);
          }
        }

        // Re-throw the original error with additional context
        if (error instanceof Error) {
          throw new Error(
            `Rate limiting acceptance test failed: ${error.message}. ` +
            `Test context: rateLimitingStarted=${rateLimitingStarted}, rateLimitingEnded=${rateLimitingEnded}, ` +
            `testIdentifier=${testIdentifier}`
          );
        } else {
          throw error;
        }
      }
    }, 60000); // Increased timeout for rate limiting operations
  });
});