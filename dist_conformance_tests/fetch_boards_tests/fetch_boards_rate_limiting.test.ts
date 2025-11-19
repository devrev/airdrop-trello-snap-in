import axios from 'axios';
import { getCredentialsFromEnv, createFetchBoardsEvent, sendEventToSnapIn } from './test-helpers';

describe('fetch_boards rate limiting tests', () => {
  let credentials: ReturnType<typeof getCredentialsFromEnv>;

  beforeAll(() => {
    credentials = getCredentialsFromEnv();
  });

  describe('Acceptance Test: fetch_boards_rate_limiting', () => {
    it('should handle rate limiting with 429 status code and valid api_delay', async () => {
      // Generate unique test identifier for correlation with rate limiting server
      const testIdentifier = `fetch_boards_rate_limiting_${Date.now()}`;

      // Step 1: Trigger rate limiting on the mock server
      console.log(`Triggering rate limiting for test: ${testIdentifier}`);
      
      let rateLimitingResponse;
      try {
        rateLimitingResponse = await axios.post(
          'http://localhost:8004/start_rate_limiting',
          { test_name: testIdentifier },
          {
            headers: { 'Content-Type': 'application/json' },
            validateStatus: () => true,
          }
        );

        console.log(`Rate limiting server response status: ${rateLimitingResponse.status}`);
        
        if (rateLimitingResponse.status !== 200) {
          console.error(
            `Failed to trigger rate limiting. Status: ${rateLimitingResponse.status}, ` +
            `Response: ${JSON.stringify(rateLimitingResponse.data)}`
          );
          throw new Error(`Rate limiting server returned non-200 status: ${rateLimitingResponse.status}`);
        }
      } catch (error) {
        console.error('Error triggering rate limiting:', error);
        throw new Error(`Failed to connect to rate limiting server at http://localhost:8004/start_rate_limiting: ${error}`);
      }

      // Step 2: Create event payload with valid credentials
      const event = createFetchBoardsEvent(credentials);

      // Step 3: Invoke fetch_boards function
      console.log('Invoking fetch_boards function...');
      const response = await sendEventToSnapIn(event);

      // Step 4: Verify response structure
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      if (!response.data) {
        throw new Error('Response data is undefined');
      }

      // Log full response for debugging
      console.log('Full response:', JSON.stringify(response.data, null, 2));

      // Verify no error in response wrapper
      if (response.data.error) {
        console.error('Unexpected error in response:', JSON.stringify(response.data.error, null, 2));
        throw new Error(`Response contains error: ${JSON.stringify(response.data.error)}`);
      }

      expect(response.data.function_result).toBeDefined();

      const functionResult = response.data.function_result;

      // Step 5: Assert rate limiting behavior

      // Requirement 1: Verify status_code is 429
      if (functionResult.status_code !== 429) {
        console.error(
          `Expected status_code to be 429 (rate limited), but got ${functionResult.status_code}.\n` +
          `Test identifier: ${testIdentifier}\n` +
          `Full function result: ${JSON.stringify(functionResult, null, 2)}`
        );
        throw new Error(
          `Rate limiting not detected. Expected status_code=429, got status_code=${functionResult.status_code}. ` +
          `This indicates the function did not properly handle the 429 response from Trello API.`
        );
      }
      expect(functionResult.status_code).toBe(429);

      // Requirement 2: Verify api_delay exists and is a number
      expect(functionResult.api_delay).toBeDefined();
      
      if (typeof functionResult.api_delay !== 'number') {
        console.error(
          `Expected api_delay to be a number, but got type: ${typeof functionResult.api_delay}, ` +
          `value: ${functionResult.api_delay}`
        );
        throw new Error(`api_delay must be a number, got ${typeof functionResult.api_delay}`);
      }

      // Requirement 3: Verify api_delay > 0
      if (functionResult.api_delay <= 0) {
        console.error(
          `Expected api_delay to be greater than 0, but got ${functionResult.api_delay}.\n` +
          `This indicates the function did not extract the delay value from the API response correctly.`
        );
        throw new Error(
          `Invalid api_delay value. Expected api_delay > 0, got api_delay=${functionResult.api_delay}. ` +
          `The delay should be extracted from the Retry-After header or API response.`
        );
      }
      expect(functionResult.api_delay).toBeGreaterThan(0);

      // Requirement 4: Verify api_delay <= 3
      if (functionResult.api_delay > 3) {
        console.error(
          `Expected api_delay to be <= 3 seconds, but got ${functionResult.api_delay}.\n` +
          `This suggests the implementation may not be calculating api_delay correctly.\n` +
          `The delay should be extracted from the Retry-After header (in seconds) or defaulted to 3.`
        );
        throw new Error(
          `api_delay exceeds maximum expected value. Expected api_delay <= 3, got api_delay=${functionResult.api_delay}. ` +
          `This indicates a problem with how the implementation calculates the delay from the API response.`
        );
      }
      expect(functionResult.api_delay).toBeLessThanOrEqual(3);

      // Verify message field exists (optional but good practice)
      expect(functionResult.message).toBeDefined();
      expect(typeof functionResult.message).toBe('string');

      // Log success with details
      console.log('✓ Rate limiting test passed successfully');
      console.log(`  - Test identifier: ${testIdentifier}`);
      console.log(`  - Status code: ${functionResult.status_code}`);
      console.log(`  - API delay: ${functionResult.api_delay} seconds`);
      console.log(`  - Message: ${functionResult.message}`);
    }, 30000);
  });
});