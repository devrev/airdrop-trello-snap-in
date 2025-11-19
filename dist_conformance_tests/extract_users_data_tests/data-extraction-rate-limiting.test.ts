/**
 * Acceptance test for users data extraction with rate limiting
 * 
 * This test verifies that the extraction function correctly:
 * 1. Handles rate limiting from Trello API
 * 2. Emits EXTRACTION_DATA_DELAY event when rate limited
 * 3. Includes proper delay information in the event
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { CallbackServer } from './test-utils/callback-server';
import { getTrelloCredentials } from './test-utils/environment';
import { sendEventToSnapIn } from './test-utils/snap-in-client';

describe('Data Extraction - Users - Rate Limiting', () => {
  let callbackServer: CallbackServer;
  const CALLBACK_TIMEOUT_MS = 90000; // 90 seconds
  const RATE_LIMITING_SERVER_URL = 'http://localhost:8004/start_rate_limiting';
  const TEST_IDENTIFIER = 'data-extraction-users-rate-limiting-test';

  beforeAll(async () => {
    // Start callback server
    callbackServer = new CallbackServer();
    await callbackServer.start(8002);
  });

  afterAll(async () => {
    // Stop callback server
    await callbackServer.stop();
  });

  beforeEach(() => {
    // Clear events before each test
    callbackServer.clearEvents();
  });

  it('should emit EXTRACTION_DATA_DELAY when rate limited during users extraction', async () => {
    // Step 1: Trigger rate limiting
    console.log('[Test] Step 1: Triggering rate limiting');
    try {
      const rateLimitResponse = await axios.post(
        RATE_LIMITING_SERVER_URL,
        { test_name: TEST_IDENTIFIER },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );
      console.log('[Test] Rate limiting triggered successfully:', rateLimitResponse.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to trigger rate limiting at ${RATE_LIMITING_SERVER_URL}: ${error.message}. ` +
          `Response: ${error.response ? JSON.stringify(error.response.data) : 'No response'}. ` +
          `Please ensure the rate limiting server is running on port 8004.`
        );
      }
      throw error;
    }

    // Step 2: Load test payload
    console.log('[Test] Step 2: Loading test payload');
    const payloadPath = path.join(__dirname, 'test-payloads', 'data_extraction_test.json');
    
    if (!fs.existsSync(payloadPath)) {
      throw new Error(
        `Test payload file not found at: ${payloadPath}. ` +
        `Please ensure the file exists and the path is correct.`
      );
    }

    const payloadContent = fs.readFileSync(payloadPath, 'utf-8');
    const payload = JSON.parse(payloadContent);

    // Get credentials from environment
    let credentials;
    try {
      credentials = getTrelloCredentials();
    } catch (error) {
      throw new Error(
        `Failed to read Trello credentials from environment: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        'Please ensure TRELLO_API_KEY, TRELLO_TOKEN, and TRELLO_ORGANIZATION_ID are set.'
      );
    }

    // Replace placeholder credentials with actual values
    const connectionKey = `key=${credentials.apiKey}&token=${credentials.token}`;
    payload.payload.connection_data.key = connectionKey;
    payload.payload.connection_data.org_id = credentials.organizationId;

    console.log('[Test] Step 3: Sending EXTRACTION_DATA_START event to snap-in server');

    // Step 3: Send event to snap-in server
    const response = await sendEventToSnapIn(payload);

    // Check for errors in snap-in response
    if (response.error) {
      throw new Error(
        `Snap-in server returned error: ${JSON.stringify(response.error, null, 2)}. ` +
        `This indicates the snap-in failed to process the event. ` +
        `Full response: ${JSON.stringify(response, null, 2)}`
      );
    }

    console.log('[Test] Step 4: Waiting for callback event from DevRev servers');

    // Step 4: Wait for callback event
    let callbackEvent;
    try {
      callbackEvent = await callbackServer.waitForEvent(CALLBACK_TIMEOUT_MS);
    } catch (error) {
      const receivedEvents = callbackServer.getReceivedEvents();
      const eventTypes = receivedEvents.map(e => e.event_type).join(', ');
      throw new Error(
        `Failed to receive callback event within ${CALLBACK_TIMEOUT_MS}ms: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Received ${receivedEvents.length} event(s) total. ` +
        `Event types: [${eventTypes}]. ` +
        `Full events: ${JSON.stringify(receivedEvents, null, 2)}`
      );
    }

    console.log('[Test] Step 5: Verifying callback event contents');

    // Step 5: Verify exactly one event was received
    const allEvents = callbackServer.getReceivedEvents();
    expect(allEvents.length).toBe(1);
    if (allEvents.length !== 1) {
      const eventTypes = allEvents.map(e => e.event_type).join(', ');
      throw new Error(
        `Expected exactly 1 callback event, but received ${allEvents.length}. ` +
        `Event types: [${eventTypes}]. ` +
        `This indicates the snap-in emitted multiple events or no events. ` +
        `Full events: ${JSON.stringify(allEvents, null, 2)}`
      );
    }

    // Step 6: Verify event_type is EXTRACTION_DATA_DELAY
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DELAY');
    if (callbackEvent.event_type !== 'EXTRACTION_DATA_DELAY') {
      throw new Error(
        `Expected event_type to be 'EXTRACTION_DATA_DELAY', but got '${callbackEvent.event_type}'. ` +
        `This indicates the snap-in did not properly handle rate limiting. ` +
        `Expected behavior: When rate limited (HTTP 429), the snap-in should emit EXTRACTION_DATA_DELAY. ` +
        `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    // Step 7: Verify event_data exists
    expect(callbackEvent.event_data).toBeDefined();
    if (!callbackEvent.event_data) {
      throw new Error(
        `Expected event_data to be defined, but it was ${callbackEvent.event_data}. ` +
        `The EXTRACTION_DATA_DELAY event must include event_data with delay information. ` +
        `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    // Step 8: Verify delay field exists and is valid
    expect(callbackEvent.event_data.delay).toBeDefined();
    if (callbackEvent.event_data.delay === undefined || callbackEvent.event_data.delay === null) {
      throw new Error(
        `Expected event_data.delay to be defined, but it was ${callbackEvent.event_data.delay}. ` +
        `The EXTRACTION_DATA_DELAY event must include a delay value in seconds. ` +
        `Full event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}`
      );
    }

    // Verify delay is a positive number
    const delay = callbackEvent.event_data.delay;
    expect(typeof delay).toBe('number');
    expect(delay).toBeGreaterThan(0);
    if (typeof delay !== 'number' || delay <= 0) {
      throw new Error(
        `Expected event_data.delay to be a positive number, but got ${delay} (type: ${typeof delay}). ` +
        `The delay must be a positive integer representing seconds to wait before retrying. ` +
        `Full event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}`
      );
    }

    console.log(`[Test] ✓ All verifications passed successfully. Delay: ${delay} seconds`);
  });
});