import {
  readCredentials,
  buildConnectionDataKey,
  setupCallbackServer,
  sendEventToSnapIn,
  waitForCallbackEvent,
} from './test-utils';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

describe('Extract Cards Data - Rate Limiting Acceptance Test', () => {
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  test('should handle rate limiting and emit EXTRACTION_DATA_DELAY event', async () => {
    // Read credentials from environment
    const { apiKey, token, orgId } = readCredentials();

    // Setup callback server
    const { eventPromise, cleanup: cleanupServer } = setupCallbackServer(8002);
    cleanup = cleanupServer;

    // Step 1: Trigger rate limiting
    console.log('Step 1: Triggering rate limiting...');
    const rateLimitUrl = 'http://localhost:8004/start_rate_limiting';
    const rateLimitPayload = {
      test_name: 'extract_cards_rate_limiting',
    };

    let rateLimitResponse;
    try {
      rateLimitResponse = await axios.post(rateLimitUrl, rateLimitPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to trigger rate limiting at ${rateLimitUrl}. ` +
          `Error: ${error.message}. ` +
          `Response status: ${error.response?.status}. ` +
          `Response data: ${JSON.stringify(error.response?.data)}. ` +
          `Please ensure the rate limiting server is running on port 8004.`
        );
      }
      throw error;
    }

    if (rateLimitResponse.status !== 200) {
      throw new Error(
        `Rate limiting trigger failed with status ${rateLimitResponse.status}. ` +
        `Response: ${JSON.stringify(rateLimitResponse.data)}. ` +
        `Expected status 200.`
      );
    }

    console.log('✓ Rate limiting triggered successfully');

    // Step 2: Load and modify test payload
    const payloadPath = path.join(__dirname, 'extract_cards_rate_limiting_payload.json');
    const payloadTemplate = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));

    // Replace placeholders with actual credentials
    const connectionDataKey = buildConnectionDataKey(apiKey, token);
    payloadTemplate.payload.connection_data.key = connectionDataKey;
    payloadTemplate.payload.connection_data.org_id = orgId;

    // Send event to snap-in server
    console.log('Step 2: Sending EXTRACTION_DATA_START event to snap-in server...');
    await sendEventToSnapIn(payloadTemplate);

    // Wait for callback event
    console.log('Waiting for callback event from DevRev...');
    const callbackEvent = await waitForCallbackEvent(eventPromise, 100000);

    // Validation 1: Check that we received exactly one event
    if (!callbackEvent) {
      throw new Error(
        'No callback event received from DevRev. ' +
        'Expected to receive an EXTRACTION_DATA_DELAY event when rate limiting is triggered. ' +
        'This indicates the extraction function may not be detecting rate limiting (HTTP 429) ' +
        'or not emitting the EXTRACTION_DATA_DELAY event properly. ' +
        'Check the rate limiting detection logic in data-extraction-phases.ts and ' +
        'verify that ExtractorEventType.ExtractionDataDelay is emitted when status_code === 429.'
      );
    }

    console.log('Received callback event:', JSON.stringify(callbackEvent, null, 2));

    // Validation 2: Check event_type is EXTRACTION_DATA_DELAY
    const eventType = callbackEvent.event_type;
    if (eventType !== 'EXTRACTION_DATA_DELAY') {
      throw new Error(
        `Expected event_type to be 'EXTRACTION_DATA_DELAY' when rate limiting is triggered, ` +
        `but got '${eventType}'. ` +
        `This indicates the extraction function is not properly handling rate limiting. ` +
        `When the Trello API returns HTTP 429 (rate limit exceeded), the function should: ` +
        `1. Detect the 429 status code immediately after the API call ` +
        `2. Extract the delay from the response (api_delay field) ` +
        `3. Emit ExtractorEventType.ExtractionDataDelay with the delay value ` +
        `4. Return immediately without further processing ` +
        `Full event received: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    console.log('✓ Event type is EXTRACTION_DATA_DELAY as expected');

    // Validation 3: Check event_data contains valid delay field
    const eventData = callbackEvent.event_data;
    if (!eventData) {
      throw new Error(
        'Expected callback event to have event_data field, but it is missing. ' +
        'When emitting EXTRACTION_DATA_DELAY, the event must include event_data with a delay field. ' +
        'Example: await adapter.emit(ExtractorEventType.ExtractionDataDelay, { delay: <number> }). ' +
        `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    const delay = eventData.delay;
    if (typeof delay !== 'number') {
      throw new Error(
        `Expected event_data.delay to be a number, but got type '${typeof delay}' with value: ${delay}. ` +
        'The delay field must be a numeric value representing seconds to wait before retrying. ' +
        'It should be extracted from the Trello API response (api_delay field) when HTTP 429 is received. ' +
        `Full event_data: ${JSON.stringify(eventData, null, 2)}`
      );
    }

    if (delay <= 0) {
      throw new Error(
        `Expected event_data.delay to be greater than 0, but got ${delay}. ` +
        'The delay value should be a positive number indicating how many seconds to wait. ' +
        'Verify that the api_delay field from the Trello API response is being correctly extracted and passed. ' +
        `Full event_data: ${JSON.stringify(eventData, null, 2)}`
      );
    }

    console.log(`✓ Valid delay field found: ${delay} seconds`);
    console.log('✓ Rate limiting handled correctly - EXTRACTION_DATA_DELAY event emitted with valid delay');
  }, 120000); // 120 second timeout
});