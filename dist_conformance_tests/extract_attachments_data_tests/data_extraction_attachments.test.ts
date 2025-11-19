import * as fs from 'fs';
import * as path from 'path';
import { setupCallbackServer, sendEventToSnapIn, waitForCallback, cleanupCallbackServer } from './test/http_client';

describe('Data Extraction - Attachments Validation', () => {
  let callbackServer: any;
  const CALLBACK_PORT = 8002;
  const SNAP_IN_URL = 'http://localhost:8000/handle/sync';

  beforeAll(async () => {
    callbackServer = await setupCallbackServer(CALLBACK_PORT);
  });

  afterAll(async () => {
    await cleanupCallbackServer(callbackServer);
  });

  test('data_extraction_attachments_validation', async () => {
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

    // Step 2: Send EXTRACTION_DATA_START event to snap-in server
    console.log('Sending EXTRACTION_DATA_START event to snap-in server...');
    await sendEventToSnapIn(SNAP_IN_URL, testPayload);

    // Step 3: Wait for callback event (timeout: 100 seconds)
    console.log('Waiting for callback event from snap-in...');
    const callbackEvent = await waitForCallback(callbackServer, 100000);

    // Step 4: Verify callback event is received
    if (!callbackEvent) {
      throw new Error(
        'Callback event validation failed:\n' +
        '- Expected: Callback event to be received\n' +
        '- Actual: No callback event received\n' +
        '- Timeout: 100 seconds\n' +
        '\nDebugging info:\n' +
        '- Callback server port: ' + CALLBACK_PORT + '\n' +
        '- Snap-in URL: ' + SNAP_IN_URL + '\n' +
        '- Test payload: ' + JSON.stringify(testPayload, null, 2)
      );
    }

    // Step 5: Verify event_type is EXTRACTION_DATA_DONE
    if (callbackEvent.event_type !== 'EXTRACTION_DATA_DONE') {
      throw new Error(
        'Callback event type validation failed:\n' +
        '- Expected event_type: EXTRACTION_DATA_DONE\n' +
        '- Actual event_type: ' + callbackEvent.event_type + '\n' +
        '\nFull callback event:\n' +
        JSON.stringify(callbackEvent, null, 2)
      );
    }

    // Step 6: Verify artifacts array exists
    if (!callbackEvent.event_data || !callbackEvent.event_data.artifacts) {
      throw new Error(
        'Artifacts array validation failed:\n' +
        '- Expected: event_data.artifacts array to exist\n' +
        '- Actual: ' + (callbackEvent.event_data ? 'event_data exists but artifacts missing' : 'event_data missing') + '\n' +
        '\nFull callback event:\n' +
        JSON.stringify(callbackEvent, null, 2)
      );
    }

    const artifacts = callbackEvent.event_data.artifacts;

    // Step 7: Verify artifacts array is not empty
    if (!Array.isArray(artifacts) || artifacts.length === 0) {
      throw new Error(
        'Artifacts array length validation failed:\n' +
        '- Expected: artifacts array length > 0\n' +
        '- Actual: ' + (Array.isArray(artifacts) ? 'length = ' + artifacts.length : 'not an array') + '\n' +
        '\nFull callback event:\n' +
        JSON.stringify(callbackEvent, null, 2)
      );
    }

    // Step 8: Find attachments artifact
    const attachmentsArtifact = artifacts.find((artifact: any) => artifact.item_type === 'attachments');

    if (!attachmentsArtifact) {
      const availableItemTypes = artifacts.map((a: any) => a.item_type || 'undefined').join(', ');
      throw new Error(
        'Attachments artifact validation failed:\n' +
        '- Expected: artifact with item_type = "attachments"\n' +
        '- Actual: No artifact with item_type "attachments" found\n' +
        '- Available item_types: [' + availableItemTypes + ']\n' +
        '- Total artifacts count: ' + artifacts.length + '\n' +
        '\nAll artifacts:\n' +
        JSON.stringify(artifacts, null, 2) +
        '\n\nFull callback event:\n' +
        JSON.stringify(callbackEvent, null, 2)
      );
    }

    // Step 9: Verify attachments artifact item_count
    const expectedItemCount = 2;
    const actualItemCount = attachmentsArtifact.item_count;

    if (actualItemCount !== expectedItemCount) {
      throw new Error(
        'Attachments item_count validation failed:\n' +
        '- Expected item_count: ' + expectedItemCount + '\n' +
        '- Actual item_count: ' + actualItemCount + '\n' +
        '\nAttachments artifact:\n' +
        JSON.stringify(attachmentsArtifact, null, 2) +
        '\n\nDebugging info:\n' +
        '- Board ID: ' + testPayload.payload.event_context.external_sync_unit_id + '\n' +
        '- Expected attachments: 2 attachments from card "68e8befc8381b0efa25ce1eb"\n' +
        '- Possible issues:\n' +
        '  * Not all attachments were extracted from the card\n' +
        '  * Attachments extraction logic may have filtering issues\n' +
        '  * Card may not have the expected attachments\n' +
        '\nFull callback event:\n' +
        JSON.stringify(callbackEvent, null, 2)
      );
    }

    // Validation succeeded
    console.log('Attachments extraction validation passed:');
    console.log('- Callback event received: ✓');
    console.log('- Event type: EXTRACTION_DATA_DONE ✓');
    console.log('- Artifacts array length: ' + artifacts.length + ' ✓');
    console.log('- Attachments artifact found: ✓');
    console.log('- Attachments item_count: ' + actualItemCount + ' ✓');

    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');
    expect(artifacts.length).toBeGreaterThan(0);
    expect(attachmentsArtifact).toBeDefined();
    expect(attachmentsArtifact.item_count).toBe(expectedItemCount);
  }, 120000); // 120 second timeout
});