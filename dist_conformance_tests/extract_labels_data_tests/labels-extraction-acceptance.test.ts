import { CallbackServer, loadTestPayload, invokeSnapIn } from './helpers/test-helpers';

describe('Labels Data Extraction - Acceptance Test', () => {
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

  test('should extract exactly 6 labels and report correct item_count in callback', async () => {
    // Load test payload with actual credentials
    const payload = loadTestPayload('data_extraction_test.json');

    console.log('Invoking extraction function for labels data extraction...');

    // Invoke the extraction function
    await invokeSnapIn(payload);

    console.log('Waiting for EXTRACTION_DATA_DONE callback event...');

    // Wait for the callback event indicating extraction completion
    const callbackEvent = await callbackServer.waitForEvent('EXTRACTION_DATA_DONE', 60000);

    console.log('Received callback event:', JSON.stringify(callbackEvent, null, 2));

    // Verify extraction completed successfully
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');

    // Validate event_data exists
    if (!callbackEvent.event_data) {
      throw new Error(
        'Callback event is missing event_data field. ' +
        `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    // Validate artifacts array exists
    const artifacts = callbackEvent.event_data.artifacts;
    if (!artifacts) {
      throw new Error(
        'Callback event_data is missing artifacts field. ' +
        `event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}`
      );
    }

    // Validate artifacts is an array
    if (!Array.isArray(artifacts)) {
      throw new Error(
        `artifacts field is not an array. Type: ${typeof artifacts}. ` +
        `Value: ${JSON.stringify(artifacts, null, 2)}`
      );
    }

    // Validate artifacts array is not empty
    expect(artifacts.length).toBeGreaterThan(0);
    console.log(`Found ${artifacts.length} artifact(s) in callback event`);

    // Find the labels artifact
    const labelsArtifact = artifacts.find((artifact: any) => artifact.item_type === 'labels');

    if (!labelsArtifact) {
      const availableItemTypes = artifacts.map((a: any) => a.item_type || 'undefined').join(', ');
      throw new Error(
        'Labels artifact not found in artifacts array. ' +
        `Available item_types: [${availableItemTypes}]. ` +
        `Full artifacts: ${JSON.stringify(artifacts, null, 2)}`
      );
    }

    console.log('Found labels artifact:', JSON.stringify(labelsArtifact, null, 2));

    // Validate item_count exists
    if (labelsArtifact.item_count === undefined || labelsArtifact.item_count === null) {
      throw new Error(
        'Labels artifact is missing item_count field. ' +
        `Labels artifact: ${JSON.stringify(labelsArtifact, null, 2)}`
      );
    }

    // Validate item_count is exactly 6
    const actualItemCount = labelsArtifact.item_count;
    if (actualItemCount !== 6) {
      throw new Error(
        `Labels artifact has incorrect item_count. Expected: 6, Actual: ${actualItemCount}. ` +
        `This indicates that not all labels data was extracted. ` +
        `Labels artifact: ${JSON.stringify(labelsArtifact, null, 2)}`
      );
    }

    expect(labelsArtifact.item_count).toBe(6);
    console.log('Successfully validated: labels artifact has item_count = 6');
  }, 120000);
});