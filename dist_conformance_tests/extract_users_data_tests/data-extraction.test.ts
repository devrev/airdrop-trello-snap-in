/**
 * Acceptance test for users data extraction
 * 
 * This test verifies that the extraction function correctly:
 * 1. Extracts users data from Trello
 * 2. Sends the data to DevRev servers
 * 3. Emits EXTRACTION_DATA_DONE event with correct artifact information
 */

import * as fs from 'fs';
import * as path from 'path';
import { CallbackServer } from './test-utils/callback-server';
import { getTrelloCredentials } from './test-utils/environment';
import { sendEventToSnapIn } from './test-utils/snap-in-client';

describe('Data Extraction - Users', () => {
  let callbackServer: CallbackServer;
  const CALLBACK_TIMEOUT_MS = 90000; // 90 seconds

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

  it('should extract users data and emit EXTRACTION_DATA_DONE with correct artifact', async () => {
    // Load test payload
    const payloadPath = path.join(__dirname, 'test-payloads', 'data_extraction_test.json');
    
    if (!fs.existsSync(payloadPath)) {
      throw new Error(`Test payload file not found at: ${payloadPath}`);
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

    console.log('[Test] Sending EXTRACTION_DATA_START event to snap-in server');

    // Send event to snap-in server
    const response = await sendEventToSnapIn(payload);

    // Check for errors in snap-in response
    if (response.error) {
      throw new Error(
        `Snap-in server returned error: ${JSON.stringify(response.error, null, 2)}`
      );
    }

    console.log('[Test] Waiting for callback event from DevRev servers');

    // Wait for callback event
    let callbackEvent;
    try {
      callbackEvent = await callbackServer.waitForEvent(CALLBACK_TIMEOUT_MS);
    } catch (error) {
      const receivedEvents = callbackServer.getReceivedEvents();
      throw new Error(
        `Failed to receive callback event: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Received ${receivedEvents.length} events total. ` +
        `Events: ${JSON.stringify(receivedEvents, null, 2)}`
      );
    }

    console.log('[Test] Received callback event, verifying contents');

    // Verify exactly one event was received
    const allEvents = callbackServer.getReceivedEvents();
    expect(allEvents.length).toBe(1);
    if (allEvents.length !== 1) {
      throw new Error(
        `Expected exactly 1 callback event, but received ${allEvents.length}. ` +
        `Events: ${JSON.stringify(allEvents, null, 2)}`
      );
    }

    // Verify event_type is EXTRACTION_DATA_DONE
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');
    if (callbackEvent.event_type !== 'EXTRACTION_DATA_DONE') {
      throw new Error(
        `Expected event_type to be 'EXTRACTION_DATA_DONE', but got '${callbackEvent.event_type}'. ` +
        `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    // Verify event_data exists
    expect(callbackEvent.event_data).toBeDefined();
    if (!callbackEvent.event_data) {
      throw new Error(
        `Expected event_data to be defined, but it was ${callbackEvent.event_data}. ` +
        `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    // Verify artifacts array exists
    expect(callbackEvent.event_data.artifacts).toBeDefined();
    expect(Array.isArray(callbackEvent.event_data.artifacts)).toBe(true);
    if (!Array.isArray(callbackEvent.event_data.artifacts)) {
      throw new Error(
        `Expected event_data.artifacts to be an array, but got ${typeof callbackEvent.event_data.artifacts}. ` +
        `Full event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}`
      );
    }

    const artifacts = callbackEvent.event_data.artifacts;

    // Verify artifacts array is not empty
    expect(artifacts.length).toBeGreaterThan(0);
    if (artifacts.length === 0) {
      throw new Error(
        `Expected artifacts array to have length > 0, but got length ${artifacts.length}. ` +
        `Full event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}`
      );
    }

    console.log(`[Test] Found ${artifacts.length} artifact(s), searching for users artifact`);

    // Find users artifact
    const usersArtifact = artifacts.find((artifact: any) => artifact.item_type === 'users');

    expect(usersArtifact).toBeDefined();
    if (!usersArtifact) {
      const availableItemTypes = artifacts.map((a: any) => a.item_type).join(', ');
      throw new Error(
        `Expected to find artifact with item_type='users', but none found. ` +
        `Available item_types: [${availableItemTypes}]. ` +
        `All artifacts: ${JSON.stringify(artifacts, null, 2)}`
      );
    }

    console.log('[Test] Found users artifact:', JSON.stringify(usersArtifact, null, 2));

    // Verify users artifact has item_count=3
    expect(usersArtifact.item_count).toBe(3);
    if (usersArtifact.item_count !== 3) {
      throw new Error(
        `Expected users artifact to have item_count=3, but got item_count=${usersArtifact.item_count}. ` +
        `This indicates that not all users data was extracted. ` +
        `Users artifact: ${JSON.stringify(usersArtifact, null, 2)}`
      );
    }

    console.log('[Test] ✓ All verifications passed successfully');
  });
});