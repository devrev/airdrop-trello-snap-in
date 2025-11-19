import { CallbackServer, sendEventToSnapIn, loadTestPayload, replaceCredentials } from './test-helpers';
import axios from 'axios';

describe('Data Extraction Rate Limiting Validation', () => {
  let callbackServer: CallbackServer;

  beforeAll(async () => {
    callbackServer = new CallbackServer(8002);
    await callbackServer.start();
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  beforeEach(() => {
    callbackServer.clearEvents();
  });

  test('data_extraction_rate_limiting_test', async () => {
    // Step 1: Trigger rate limiting on the rate limiting server
    const rateLimitingServerUrl = 'http://localhost:8004/start_rate_limiting';
    const rateLimitingPayload = {
      test_name: 'data_extraction_rate_limiting_test',
    };

    let rateLimitingResponse;
    try {
      rateLimitingResponse = await axios.post(rateLimitingServerUrl, rateLimitingPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error: any) {
      const errorDetails = error.response
        ? `Status: ${error.response.status}, Body: ${JSON.stringify(error.response.data)}`
        : error.message;
      throw new Error(
        `Failed to trigger rate limiting on server.\n` +
        `URL: ${rateLimitingServerUrl}\n` +
        `Request Body: ${JSON.stringify(rateLimitingPayload, null, 2)}\n` +
        `Error: ${errorDetails}`
      );
    }

    // Verify rate limiting server responded successfully
    if (rateLimitingResponse.status !== 200) {
      throw new Error(
        `Rate limiting server returned unexpected status code.\n` +
        `Expected: 200\n` +
        `Actual: ${rateLimitingResponse.status}\n` +
        `Response Body: ${JSON.stringify(rateLimitingResponse.data, null, 2)}`
      );
    }

    // Step 2: Load test payload and replace credentials
    const payload = loadTestPayload('data_extraction_test.json');
    const payloadWithCredentials = replaceCredentials(payload);

    // Send EXTRACTION_DATA_START event to snap-in server
    await sendEventToSnapIn(payloadWithCredentials);

    // Wait for callback event with timeout of 100 seconds
    const callbackEvent = await callbackServer.waitForEvent(100000);

    // Verify that exactly one callback event is received
    const allEvents = callbackServer.getEvents();
    if (allEvents.length !== 1) {
      throw new Error(
        `Expected exactly 1 callback event, but received ${allEvents.length} events.\n` +
        `This indicates that the extraction function did not handle rate limiting correctly.\n` +
        `Expected behavior: When rate limited, the function should emit a single EXTRACTION_DATA_DELAY event.\n` +
        `Events received: ${JSON.stringify(allEvents, null, 2)}`
      );
    }
    expect(allEvents.length).toBe(1);

    // Verify that event_type is 'EXTRACTION_DATA_DELAY'
    if (callbackEvent.event_type !== 'EXTRACTION_DATA_DELAY') {
      throw new Error(
        `Expected event_type to be 'EXTRACTION_DATA_DELAY', but received '${callbackEvent.event_type}'.\n` +
        `This indicates that the extraction function did not properly detect or handle the rate limiting response.\n` +
        `When the Trello API returns status code 429 (rate limited), the function must:\n` +
        `  1. Detect the 429 status code\n` +
        `  2. Extract the delay value from the response\n` +
        `  3. Emit an EXTRACTION_DATA_DELAY event with the delay value\n` +
        `Full callback event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DELAY');

    // Verify that event_data contains a valid delay value
    if (!callbackEvent.event_data) {
      throw new Error(
        `Expected callback event to contain 'event_data' object, but it was missing.\n` +
        `The EXTRACTION_DATA_DELAY event must include event_data with a 'delay' field.\n` +
        `Full callback event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    const delay = callbackEvent.event_data.delay;
    if (delay === undefined || delay === null) {
      throw new Error(
        `Expected 'event_data.delay' to be present, but it was missing.\n` +
        `The delay field must contain the number of seconds to wait before retrying.\n` +
        `event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}\n` +
        `Full callback event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    if (typeof delay !== 'number' && typeof delay !== 'string') {
      throw new Error(
        `Expected 'event_data.delay' to be a number or string, but received type: ${typeof delay}.\n` +
        `Delay value: ${delay}\n` +
        `event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}\n` +
        `Full callback event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    // Convert delay to number if it's a string
    const delayNumber = typeof delay === 'string' ? parseInt(delay, 10) : delay;

    if (isNaN(delayNumber) || delayNumber <= 0) {
      throw new Error(
        `Expected 'event_data.delay' to be a positive number, but received: ${delay}.\n` +
        `The delay must be a valid positive integer representing seconds.\n` +
        `event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}\n` +
        `Full callback event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    expect(delayNumber).toBeGreaterThan(0);
  }, 120000);
});