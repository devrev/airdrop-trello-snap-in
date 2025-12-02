/**
 * Conformance tests for metadata extraction functionality
 * Tests the EXTRACTION_METADATA_START event handling
 */
import { CallbackServer, readCredentials, replaceCredentials, sendEventToSnapIn } from './test-utils';
import * as metadataExtractionEvent from './metadata-extraction-event.json';

describe('Metadata Extraction Tests', () => {
  let callbackServer: CallbackServer;

  beforeAll(async () => {
    // Start callback server before all tests
    callbackServer = new CallbackServer(8002);
    await callbackServer.start();
  });

  afterAll(async () => {
    // Stop callback server after all tests
    await callbackServer.stop();
  });

  test('should emit EXTRACTION_METADATA_DONE event when metadata extraction succeeds', async () => {
    // Read credentials from environment
    let credentials;
    try {
      credentials = readCredentials();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to read credentials from environment: ${errorMessage}`);
    }

    // Prepare event with actual credentials
    const event = replaceCredentials(metadataExtractionEvent, credentials);

    // Send event to snap-in server
    let snapInResponse;
    try {
      snapInResponse = await sendEventToSnapIn(event);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to send event to snap-in server: ${errorMessage}`);
    }

    // Wait for callback from DevRev
    let receivedEvents;
    try {
      receivedEvents = await callbackServer.waitForEvents(30000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to receive callback from DevRev: ${errorMessage}\n` +
        `Snap-in response: ${JSON.stringify(snapInResponse, null, 2)}`
      );
    }

    // Verify exactly one event was received
    if (receivedEvents.length === 0) {
      throw new Error(
        'Expected to receive EXTRACTION_METADATA_DONE event but received none.\n' +
        `Snap-in response: ${JSON.stringify(snapInResponse, null, 2)}`
      );
    }

    if (receivedEvents.length > 1) {
      throw new Error(
        `Expected exactly one event but received ${receivedEvents.length}.\n` +
        `Received events: ${JSON.stringify(receivedEvents, null, 2)}`
      );
    }

    const receivedEvent = receivedEvents[0];

    // Verify event type
    const eventType = receivedEvent?.event_type;
    if (eventType !== 'EXTRACTION_METADATA_DONE') {
      throw new Error(
        `Expected event_type to be 'EXTRACTION_METADATA_DONE' but received '${eventType}'.\n` +
        `Full event: ${JSON.stringify(receivedEvent, null, 2)}\n` +
        `Snap-in response: ${JSON.stringify(snapInResponse, null, 2)}`
      );
    }

    // Success - event type matches
    expect(eventType).toBe('EXTRACTION_METADATA_DONE');
    expect(receivedEvents.length).toBe(1);
  });
});