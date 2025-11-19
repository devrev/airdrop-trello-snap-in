import { CallbackServer, sendEventToSnapIn, loadTestPayload, replaceCredentials } from './test-helpers';

describe('Data Extraction Comments Validation', () => {
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

  test('data_extraction_comments_validation', async () => {
    // Load test payload and replace credentials
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
        `Events received: ${JSON.stringify(allEvents, null, 2)}`
      );
    }
    expect(allEvents.length).toBe(1);

    // Verify that event_type is 'EXTRACTION_DATA_DONE'
    if (callbackEvent.event_type !== 'EXTRACTION_DATA_DONE') {
      throw new Error(
        `Expected event_type to be 'EXTRACTION_DATA_DONE', but received '${callbackEvent.event_type}'.\n` +
        `Full callback event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');

    // Verify that event_data.artifacts exists and is an array
    if (!callbackEvent.event_data || !callbackEvent.event_data.artifacts) {
      throw new Error(
        `Expected callback event to contain 'data.artifacts' array, but it was missing.\n` +
        `Full callback event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    const artifacts = callbackEvent.event_data.artifacts;
    if (!Array.isArray(artifacts)) {
      throw new Error(
        `Expected 'data.artifacts' to be an array, but received type: ${typeof artifacts}.\n` +
        `Full callback event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    // Verify that artifacts array has length > 0
    if (artifacts.length === 0) {
      throw new Error(
        `Expected 'data.artifacts' array to have length > 0, but it was empty.\n` +
        `Full callback event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }
    expect(artifacts.length).toBeGreaterThan(0);

    // Find the comments artifact
    const commentsArtifact = artifacts.find((artifact: any) => artifact.item_type === 'comments');

    if (!commentsArtifact) {
      const foundItemTypes = artifacts.map((artifact: any) => artifact.item_type).join(', ');
      throw new Error(
        `Expected to find an artifact with item_type='comments', but it was not found.\n` +
        `Found item_types: [${foundItemTypes}]\n` +
        `All artifacts: ${JSON.stringify(artifacts, null, 2)}`
      );
    }

    // Verify that comments artifact has item_count >= 2
    const itemCount = commentsArtifact.item_count;
    if (typeof itemCount !== 'number') {
      throw new Error(
        `Expected comments artifact 'item_count' to be a number, but received type: ${typeof itemCount}.\n` +
        `Comments artifact: ${JSON.stringify(commentsArtifact, null, 2)}`
      );
    }

    if (itemCount < 2) {
      throw new Error(
        `Expected comments artifact to have item_count >= 2, but received item_count=${itemCount}.\n` +
        `This indicates that not all comments data was extracted.\n` +
        `Comments artifact: ${JSON.stringify(commentsArtifact, null, 2)}\n` +
        `All artifacts: ${JSON.stringify(artifacts, null, 2)}`
      );
    }

    expect(itemCount).toBeGreaterThanOrEqual(2);
  }, 120000);
});