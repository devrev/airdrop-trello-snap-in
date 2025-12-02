import {
  readCredentialsFromEnv,
  loadEventPayload,
  sendEventToSnapIn,
  startRateLimiting,
} from './test-utils';

describe('fetch_cards rate limiting conformance tests', () => {
  test('should handle rate limiting correctly with status 429 and valid api_delay', async () => {
    // Unique test identifier
    const testName = 'fetch_cards_rate_limiting_test_001';

    // Load credentials from environment
    const credentials = readCredentialsFromEnv();

    // Load event payload with credentials
    const event = loadEventPayload('fetch_cards_event.json', credentials);

    // Start rate limiting
    const rateLimitResponse = await startRateLimiting(testName);
    
    // Validate that rate limiting was started successfully
    if (rateLimitResponse.status !== 200) {
      throw new Error(
        `Failed to start rate limiting for test "${testName}". ` +
        `Expected status 200 from rate limiting server, but got: ${rateLimitResponse.status}. ` +
        `Response data: ${JSON.stringify(rateLimitResponse.data)}. ` +
        `Ensure the rate limiting server is running at http://localhost:8004.`
      );
    }

    console.log(`✓ Rate limiting started successfully for test: ${testName}`);

    // Send event to snap-in server
    const response = await sendEventToSnapIn(event);

    // Validate response status
    if (response.status !== 200) {
      throw new Error(
        `Expected HTTP status 200 from snap-in server, but got: ${response.status}. ` +
        `Response data: ${JSON.stringify(response.data)}. ` +
        `This indicates the snap-in server may not be running or is returning an error.`
      );
    }

    // Validate response structure
    if (!response.data) {
      throw new Error(
        'Expected response.data to be defined, but it was undefined. ' +
        'This indicates the snap-in server did not return a valid response.'
      );
    }

    const responseData = response.data;

    // Validate function_result exists
    if (!responseData.function_result) {
      throw new Error(
        'Expected response.data.function_result to be defined, but it was undefined. ' +
        'Response data: ' + JSON.stringify(responseData) + '. ' +
        'This indicates the function did not return a result.'
      );
    }

    const functionResult = responseData.function_result;

    // Validate status_code is 429 (rate limited)
    if (functionResult.status_code !== 429) {
      throw new Error(
        `Expected status_code to be 429 (rate limited) after starting rate limiting, but got: ${functionResult.status_code}. ` +
        `Function result: ${JSON.stringify(functionResult)}. ` +
        `This indicates that the rate limiting check in the implementation may not be working correctly. ` +
        `Check that the TrelloClient properly handles 429 responses from the Trello API and returns them with status_code=429. ` +
        `Verify that handleTrelloError() in trello-error-handler.ts correctly processes 429 status codes.`
      );
    }

    console.log('✓ Status code is 429 (rate limited) as expected');

    // Validate api_delay exists
    if (functionResult.api_delay === undefined || functionResult.api_delay === null) {
      throw new Error(
        'Expected api_delay to be defined in the function result, but it was undefined or null. ' +
        `Function result: ${JSON.stringify(functionResult)}. ` +
        'This indicates that the implementation did not return an api_delay value when rate limited. ' +
        'Check that handleTrelloError() in trello-error-handler.ts extracts and returns the api_delay from the Retry-After header.'
      );
    }

    const apiDelay = functionResult.api_delay;

    // Validate api_delay is a number
    if (typeof apiDelay !== 'number') {
      throw new Error(
        `Expected api_delay to be a number, but got type: ${typeof apiDelay}. ` +
        `Value: ${apiDelay}. ` +
        'This indicates that the implementation is not returning api_delay as a numeric value. ' +
        'Check that the api_delay is properly parsed as an integer in handleTrelloError().'
      );
    }

    // Validate api_delay > 0
    if (apiDelay <= 0) {
      throw new Error(
        `Expected api_delay to be greater than 0, but got: ${apiDelay}. ` +
        'This indicates that the implementation is not correctly extracting the delay from the Retry-After header. ' +
        'Check that handleTrelloError() in trello-error-handler.ts properly parses the Retry-After header value.'
      );
    }

    console.log(`✓ api_delay is greater than 0: ${apiDelay}`);

    // Validate api_delay <= 3
    if (apiDelay > 3) {
      throw new Error(
        `Expected api_delay to be less than or equal to 3, but got: ${apiDelay}. ` +
        'This indicates that the api_delay calculation in the implementation may be incorrect. ' +
        'The Retry-After header should be parsed as seconds, not milliseconds or other units. ' +
        'Check that handleTrelloError() in trello-error-handler.ts correctly interprets the Retry-After header value. ' +
        'Verify that no multiplication or conversion is being applied to the delay value.'
      );
    }

    console.log(`✓ api_delay is less than or equal to 3: ${apiDelay}`);

    // Validate message exists and is appropriate
    if (!functionResult.message) {
      throw new Error(
        'Expected message to be defined in the function result, but it was undefined. ' +
        `Function result: ${JSON.stringify(functionResult)}. ` +
        'This indicates that the implementation did not return a message when rate limited.'
      );
    }

    console.log(`✓ Message returned: "${functionResult.message}"`);

    // All validations passed
    console.log('✓ All rate limiting validations passed successfully');
    console.log(`  - status_code: 429`);
    console.log(`  - api_delay: ${apiDelay} (valid range: 0 < delay <= 3)`);
    console.log(`  - message: "${functionResult.message}"`);
  });
});