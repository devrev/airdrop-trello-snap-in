import { Server } from 'http';
import {
  getCredentialsFromEnv,
  createFetchUsersEventPayload,
  setupCallbackServer,
  teardownCallbackServer,
  invokeSnapInFunction,
  triggerRateLimiting,
  CallbackServerSetup,
} from './test-helpers';

describe('fetch_users function rate limiting acceptance tests', () => {
  let callbackServerSetup: CallbackServerSetup;
  let credentials: ReturnType<typeof getCredentialsFromEnv>;

  beforeAll(async () => {
    // Setup callback server
    callbackServerSetup = await setupCallbackServer(8002);

    // Get credentials from environment
    credentials = getCredentialsFromEnv();
  });

  afterAll(async () => {
    // Teardown callback server
    if (callbackServerSetup?.server) {
      await teardownCallbackServer(callbackServerSetup.server);
    }
  });

  describe('Test 1: fetch_users_handles_rate_limiting_correctly', () => {
    it('should return status_code 429 with valid api_delay when rate limited', async () => {
      // Trigger rate limiting on the test server
      const testName = 'fetch_users_rate_limiting_test';
      console.log(`Triggering rate limiting for test: ${testName}`);
      
      try {
        await triggerRateLimiting(testName);
        console.log('Rate limiting triggered successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        fail(`Failed to trigger rate limiting: ${errorMessage}`);
        return;
      }

      // Create event payload with valid credentials
      const eventPayload = createFetchUsersEventPayload(credentials);
      console.log('Event payload created with credentials');

      // Invoke the snap-in function
      let response: any;
      try {
        response = await invokeSnapInFunction('fetch_users', eventPayload);
        console.log(`Received response with status: ${response.status}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        fail(`Failed to invoke snap-in function: ${errorMessage}`);
        return;
      }

      // Verify HTTP 200 response status (the snap-in server returns 200 even for rate limiting)
      expect(response.status).toBe(
        200,
        `Expected HTTP status to be 200, but got ${response.status}`
      );

      // Verify presence of response data
      expect(response.data).toBeDefined();
      expect(response.data).not.toBeNull();

      // Verify function_result exists
      expect(response.data.function_result).toBeDefined();
      expect(typeof response.data.function_result).toBe('object');

      const functionResult = response.data.function_result;
      console.log('Function result:', JSON.stringify(functionResult, null, 2));

      // Verify status_code is 429 (rate limited)
      expect(functionResult.status_code).toBe(
        429,
        `Expected status_code to be 429 (rate limited), but got ${functionResult.status_code}. ` +
        `This indicates the rate limiting was not triggered correctly or not handled properly. ` +
        `Full response: ${JSON.stringify(functionResult, null, 2)}`
      );

      // Verify api_delay field exists
      expect(functionResult.api_delay).toBeDefined();
      expect(typeof functionResult.api_delay).toBe(
        'number',
        `Expected api_delay to be a number, but got type ${typeof functionResult.api_delay}`
      );

      const apiDelay = functionResult.api_delay;

      // Verify api_delay is greater than 0
      expect(apiDelay).toBeGreaterThan(
        0,
        `Expected api_delay to be greater than 0, but got ${apiDelay}. ` +
        `This indicates the delay value was not properly extracted from the rate limiting response.`
      );

      // Verify api_delay is less than or equal to 3
      if (apiDelay > 3) {
        fail(
          `Expected api_delay to be <= 3, but got ${apiDelay}. ` +
          `This suggests incorrect delay calculation in the implementation. ` +
          `The api_delay should be extracted from the Retry-After header or defaulted to 3. ` +
          `Please check the TrelloClient.getOrganizationMembers() and TrelloClient.getMemberDetails() ` +
          `methods to ensure they correctly parse the api_delay from rate limiting responses.`
        );
      }

      expect(apiDelay).toBeLessThanOrEqual(
        3,
        `Expected api_delay to be <= 3, but got ${apiDelay}`
      );

      // Verify message field exists and indicates rate limiting
      expect(functionResult.message).toBeDefined();
      expect(typeof functionResult.message).toBe('string');
      expect(functionResult.message.toLowerCase()).toContain(
        'rate limit',
        `Expected message to contain "rate limit", but got: "${functionResult.message}"`
      );

      console.log(
        `Rate limiting test passed successfully. api_delay: ${apiDelay}, message: "${functionResult.message}"`
      );
    }, 60000);
  });
});