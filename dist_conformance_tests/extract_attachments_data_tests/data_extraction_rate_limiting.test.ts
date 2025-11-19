import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { setupCallbackServer, sendEventToSnapIn, waitForCallback, cleanupCallbackServer } from './test/http_client';

describe('Data Extraction - Rate Limiting Validation', () => {
  let callbackServer: any;
  const CALLBACK_PORT = 8002;
  const SNAP_IN_URL = 'http://localhost:8000/handle/sync';
  const RATE_LIMITING_SERVER_URL = 'http://localhost:8004/start_rate_limiting';

  beforeAll(async () => {
    callbackServer = await setupCallbackServer(CALLBACK_PORT);
  });

  afterAll(async () => {
    await cleanupCallbackServer(callbackServer);
  });

  test('data_extraction_rate_limiting_validation', async () => {
    // Step 1: Load test payload and replace credentials
    const testPayloadPath = path.join(__dirname, 'data_extraction_test.json');
    if (!fs.existsSync(testPayloadPath)) {
      throw new Error(`Test payload file not found: ${testPayloadPath}`);
    }

    const testPayload = JSON.parse(fs.readFileSync(testPayloadPath, 'utf-8'));

    // Replace placeholder credentials with actual values from environment
    const trelloApiKey = process.env.TRELLO_API_KEY;
    const trelloToken = process.env.TRELLO_TOKEN;
    const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

    if (!trelloApiKey || !trelloToken || !trelloOrgId) {
      throw new Error(
        'Missing required environment variables:\n' +
        '- TRELLO_API_KEY: ' + (trelloApiKey ? 'set' : 'NOT SET') + '\n' +
        '- TRELLO_TOKEN: ' + (trelloToken ? 'set' : 'NOT SET') + '\n' +
        '- TRELLO_ORGANIZATION_ID: ' + (trelloOrgId ? 'set' : 'NOT SET')
      );
    }

    testPayload.payload.connection_data.key = `key=${trelloApiKey}&token=${trelloToken}`;
    testPayload.payload.connection_data.org_id = trelloOrgId;

    // Step 2: Trigger rate limiting
    console.log('Triggering rate limiting on server...');
    let rateLimitingResponse;
    try {
      rateLimitingResponse = await axios.post(
        RATE_LIMITING_SERVER_URL,
        { test_name: 'data_extraction_rate_limiting_validation' },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          'Failed to trigger rate limiting:\n' +
          '- URL: ' + RATE_LIMITING_SERVER_URL + '\n' +
          '- Error: ' + error.message + '\n' +
          '- Status: ' + (error.response?.status || 'N/A') + '\n' +
          '- Response: ' + JSON.stringify(error.response?.data || {}, null, 2) + '\n' +
          '\nDebugging info:\n' +
          '- Ensure rate limiting server is running on port 8004\n' +
          '- Verify the /start_rate_limiting endpoint is available\n' +
          '- Check server logs for errors'
        );
      }
      throw error;
    }

    if (rateLimitingResponse.status !== 200) {
      throw new Error(
        'Rate limiting trigger failed:\n' +
        '- Expected status: 200\n' +
        '- Actual status: ' + rateLimitingResponse.status + '\n' +
        '- Response: ' + JSON.stringify(rateLimitingResponse.data, null, 2)
      );
    }

    console.log('Rate limiting triggered successfully');

    // Step 3: Send EXTRACTION_DATA_START event to snap-in server
    console.log('Sending EXTRACTION_DATA_START event to snap-in server...');
    await sendEventToSnapIn(SNAP_IN_URL, testPayload);

    // Step 4: Wait for callback event (timeout: 100 seconds)
    console.log('Waiting for callback event from snap-in...');
    const callbackEvent = await waitForCallback(callbackServer, 100000);

    // Step 5: Verify callback event is received
    if (!callbackEvent) {
      throw new Error(
        'Callback event validation failed:\n' +
        '- Expected: Callback event to be received\n' +
        '- Actual: No callback event received\n' +
        '- Timeout: 100 seconds\n' +
        '\nDebugging info:\n' +
        '- Callback server port: ' + CALLBACK_PORT + '\n' +
        '- Snap-in URL: ' + SNAP_IN_URL + '\n' +
        '- Rate limiting server URL: ' + RATE_LIMITING_SERVER_URL + '\n' +
        '- Test payload: ' + JSON.stringify(testPayload, null, 2) + '\n' +
        '\nPossible issues:\n' +
        '- Snap-in may not be handling rate limiting correctly\n' +
        '- Rate limiting may not have been triggered properly\n' +
        '- Callback URL in event may be incorrect\n' +
        '- Network connectivity issues'
      );
    }

    // Step 6: Verify exactly one callback event was received
    const receivedEventsCount = callbackServer.receivedEvents.length;
    if (receivedEventsCount !== 1) {
      throw new Error(
        'Callback event count validation failed:\n' +
        '- Expected: Exactly 1 callback event\n' +
        '- Actual: ' + receivedEventsCount + ' callback event(s)\n' +
        '\nReceived events:\n' +
        JSON.stringify(callbackServer.receivedEvents, null, 2) + '\n' +
        '\nDebugging info:\n' +
        '- The snap-in should emit exactly one EXTRACTION_DATA_DELAY event when rate limited\n' +
        '- Multiple events may indicate the snap-in is retrying or emitting multiple events\n' +
        '- Check the extraction worker implementation for proper rate limit handling'
      );
    }

    // Step 7: Verify event_type is EXTRACTION_DATA_DELAY
    if (callbackEvent.event_type !== 'EXTRACTION_DATA_DELAY') {
      throw new Error(
        'Callback event type validation failed:\n' +
        '- Expected event_type: EXTRACTION_DATA_DELAY\n' +
        '- Actual event_type: ' + callbackEvent.event_type + '\n' +
        '\nFull callback event:\n' +
        JSON.stringify(callbackEvent, null, 2) + '\n' +
        '\nDebugging info:\n' +
        '- When rate limited (HTTP 429), the snap-in must emit EXTRACTION_DATA_DELAY\n' +
        '- Check the rate limit handling logic in the extraction worker\n' +
        '- Verify the Trello client is properly detecting and reporting rate limits\n' +
        '- Ensure the extraction worker is calling adapter.emit with correct event type'
      );
    }

    // Step 8: Verify event_data exists
    if (!callbackEvent.event_data) {
      throw new Error(
        'Event data validation failed:\n' +
        '- Expected: event_data object to exist\n' +
        '- Actual: event_data is missing or undefined\n' +
        '\nFull callback event:\n' +
        JSON.stringify(callbackEvent, null, 2) + '\n' +
        '\nDebugging info:\n' +
        '- EXTRACTION_DATA_DELAY events must include event_data with delay field\n' +
        '- Check the adapter.emit call in the extraction worker'
      );
    }

    // Step 9: Verify delay field exists and is valid
    const delay = callbackEvent.event_data.delay;
    if (delay === undefined || delay === null) {
      throw new Error(
        'Delay field validation failed:\n' +
        '- Expected: event_data.delay to exist\n' +
        '- Actual: delay is ' + (delay === undefined ? 'undefined' : 'null') + '\n' +
        '\nFull callback event:\n' +
        JSON.stringify(callbackEvent, null, 2) + '\n' +
        '\nDebugging info:\n' +
        '- EXTRACTION_DATA_DELAY events must include a delay value\n' +
        '- The delay should be extracted from the Retry-After header or API response\n' +
        '- Check the rate limit handling in trello-error-handler.ts'
      );
    }

    if (typeof delay !== 'number' || !Number.isInteger(delay) || delay <= 0) {
      throw new Error(
        'Delay value validation failed:\n' +
        '- Expected: delay to be a positive integer\n' +
        '- Actual: delay = ' + delay + ' (type: ' + typeof delay + ')\n' +
        '\nFull callback event:\n' +
        JSON.stringify(callbackEvent, null, 2) + '\n' +
        '\nDebugging info:\n' +
        '- Delay must be a positive integer representing seconds\n' +
        '- Common issues:\n' +
        '  * Delay is a string instead of number\n' +
        '  * Delay is negative or zero\n' +
        '  * Delay is a float instead of integer\n' +
        '- Check the delay parsing logic in the rate limit handler'
      );
    }

    // Validation succeeded
    console.log('Rate limiting validation passed:');
    console.log('- Rate limiting triggered: ✓');
    console.log('- Callback event received: ✓');
    console.log('- Event count: 1 ✓');
    console.log('- Event type: EXTRACTION_DATA_DELAY ✓');
    console.log('- Delay value: ' + delay + ' seconds ✓');

    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DELAY');
    expect(receivedEventsCount).toBe(1);
    expect(callbackEvent.event_data).toBeDefined();
    expect(delay).toBeGreaterThan(0);
    expect(Number.isInteger(delay)).toBe(true);
  }, 120000); // 120 second timeout
});