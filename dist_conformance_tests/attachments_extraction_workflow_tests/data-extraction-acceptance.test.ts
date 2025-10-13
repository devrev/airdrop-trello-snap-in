import { TestUtils, TestEnvironment } from './test-utils';
import testEventData from './data-extraction-test-event.json';

describe('Data Extraction Acceptance Test', () => {
  let env: TestEnvironment;

  beforeAll(async () => {
    env = TestUtils.getEnvironment();
    await TestUtils.setupCallbackServer();
  });

  afterAll(async () => {
    await TestUtils.teardownCallbackServer();
  });

  beforeEach(() => {
    TestUtils.clearCallbackData();
  });

  test('should extract attachments data and complete with EXTRACTION_DATA_DONE event containing attachments artifact with item_count=2', async () => {
    // Create event from test data with environment variable substitution
    const event = {
      ...testEventData[0],
      payload: {
        ...testEventData[0].payload,
        connection_data: {
          ...testEventData[0].payload.connection_data,
          key: `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`,
          org_id: env.TRELLO_ORGANIZATION_ID,
        }
      }
    };

    console.log('Sending extraction event to snap-in server...');
    const response = await TestUtils.sendEventToSnapIn(event);
    
    expect(response).toBeDefined();
    if (response.error) {
      throw new Error(`Snap-in returned error: ${JSON.stringify(response.error, null, 2)}`);
    }
    
    console.log('Waiting for callback data from DevRev server...');
    // Wait for extraction to complete and callbacks to be received
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const callbackData = TestUtils.getCallbackData();
    console.log(`Received ${callbackData.length} callback(s) from DevRev server`);
    
    if (callbackData.length === 0) {
      throw new Error('Expected to receive callback data from DevRev server, but no callbacks were received. This indicates the extraction function may not be communicating with the callback server properly.');
    }

    // Find EXTRACTION_DATA_DONE events
    const doneEvents = callbackData.filter(cb => 
      cb.body && cb.body.event_type === 'EXTRACTION_DATA_DONE'
    );

    console.log(`Found ${doneEvents.length} EXTRACTION_DATA_DONE event(s)`);
    
    if (doneEvents.length === 0) {
      const eventTypes = callbackData.map(cb => cb.body?.event_type || 'unknown').join(', ');
      throw new Error(`Expected to receive exactly one EXTRACTION_DATA_DONE event, but received 0. Received event types: [${eventTypes}]. This indicates the extraction may have failed or not completed properly.`);
    }

    if (doneEvents.length > 1) {
      throw new Error(`Expected to receive exactly one EXTRACTION_DATA_DONE event, but received ${doneEvents.length}. Multiple completion events indicate a problem with the extraction workflow.`);
    }

    const doneEvent = doneEvents[0];
    console.log('Validating EXTRACTION_DATA_DONE event structure...');

    // Validate event structure
    if (!doneEvent.body.event_data) {
      throw new Error(`EXTRACTION_DATA_DONE event is missing event_data field. Received event body: ${JSON.stringify(doneEvent.body, null, 2)}`);
    }

    if (!doneEvent.body.event_data.artifacts) {
      throw new Error(`EXTRACTION_DATA_DONE event is missing artifacts field in event_data. Received event_data: ${JSON.stringify(doneEvent.body.event_data, null, 2)}`);
    }

    if (!Array.isArray(doneEvent.body.event_data.artifacts)) {
      throw new Error(`Expected artifacts to be an array, but received: ${typeof doneEvent.body.event_data.artifacts}. Artifacts value: ${JSON.stringify(doneEvent.body.event_data.artifacts, null, 2)}`);
    }

    const artifactArray = doneEvent.body.event_data.artifacts;
    console.log(`Found ${artifactArray.length} artifact(s) in completion event`);

    // Validate artifact array is not empty
    if (artifactArray.length === 0) {
      throw new Error('Expected artifacts array to contain at least one element, but it was empty. This indicates no data was extracted during the process.');
    }

    // Find attachments artifact
    const attachmentsArtifacts = artifactArray.filter((artifact: any) => 
      artifact.item_type === 'attachments'
    );

    console.log(`Found ${attachmentsArtifacts.length} attachments artifact(s)`);

    if (attachmentsArtifacts.length === 0) {
      const itemTypes = artifactArray.map((artifact: any) => artifact.item_type || 'unknown').join(', ');
      throw new Error(`Expected to find exactly one artifact with item_type='attachments', but found 0. Available item_types: [${itemTypes}]. Full artifacts: ${JSON.stringify(artifactArray, null, 2)}`);
    }

    if (attachmentsArtifacts.length > 1) {
      throw new Error(`Expected to find exactly one artifact with item_type='attachments', but found ${attachmentsArtifacts.length}. This indicates duplicate processing of attachments data.`);
    }

    const attachmentsArtifact = attachmentsArtifacts[0];
    console.log(`Attachments artifact details: ${JSON.stringify(attachmentsArtifact, null, 2)}`);

    // Validate item_count
    if (attachmentsArtifact.item_count === undefined || attachmentsArtifact.item_count === null) {
      throw new Error(`Attachments artifact is missing item_count field. Received artifact: ${JSON.stringify(attachmentsArtifact, null, 2)}`);
    }

    if (typeof attachmentsArtifact.item_count !== 'number') {
      throw new Error(`Expected attachments artifact item_count to be a number, but received: ${typeof attachmentsArtifact.item_count} (${attachmentsArtifact.item_count})`);
    }

    if (attachmentsArtifact.item_count < 2) {
      throw new Error(`Expected attachments artifact to have item_count=2, but received item_count=${attachmentsArtifact.item_count}. This indicates that not all attachment data was extracted. Expected 2 attachments but only ${attachmentsArtifact.item_count} were processed.`);
    }

    if (attachmentsArtifact.item_count !== 2) {
      console.warn(`Expected exactly 2 attachments but found ${attachmentsArtifact.item_count}. Test will pass but this may indicate unexpected data.`);
    }

    // Validate that artifact has required fields
    if (!attachmentsArtifact.id) {
      throw new Error(`Attachments artifact is missing required 'id' field. Received artifact: ${JSON.stringify(attachmentsArtifact, null, 2)}`);
    }

    console.log('✓ All acceptance test criteria satisfied:');
    console.log(`  - Received exactly 1 EXTRACTION_DATA_DONE event`);
    console.log(`  - Artifacts array contains ${artifactArray.length} element(s)`);
    console.log(`  - Found attachments artifact with item_count=${attachmentsArtifact.item_count}`);
    console.log(`  - Attachments artifact ID: ${attachmentsArtifact.id}`);

    // Final assertions for test framework
    expect(doneEvents.length).toBe(1);
    expect(artifactArray.length).toBeGreaterThan(0);
    expect(attachmentsArtifact.item_count).toBe(2);
    expect(attachmentsArtifact.id).toBeDefined();
  }, 60000);
});