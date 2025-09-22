import { CallbackServer, getTestEnvironment, sendEventToSnapIn } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Extraction Function - Data Acceptance Test', () => {
  let callbackServer: CallbackServer;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = new CallbackServer();
    await callbackServer.start();
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  beforeEach(() => {
    callbackServer.clearCallbacks();
  });

  test('should extract users data and receive EXTRACTION_DATA_DONE with 9 users', async () => {
    // Arrange - Load and prepare the test payload
    const payloadPath = path.join(__dirname, 'data_extraction_test_payload.json');
    
    if (!fs.existsSync(payloadPath)) {
      throw new Error(`Test payload file not found at: ${payloadPath}`);
    }

    let testPayload;
    try {
      const payloadContent = fs.readFileSync(payloadPath, 'utf8');
      testPayload = JSON.parse(payloadContent);
    } catch (error) {
      throw new Error(`Failed to parse test payload JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Replace placeholders with actual environment variables
    const payloadString = JSON.stringify(testPayload)
      .replace(/<TRELLO_API_KEY>/g, testEnv.trelloApiKey)
      .replace(/<TRELLO_TOKEN>/g, testEnv.trelloToken)
      .replace(/<TRELLO_ORGANIZATION_ID>/g, testEnv.trelloOrganizationId);

    const event = JSON.parse(payloadString);

    // Act - Send event to snap-in
    let response;
    try {
      response = await sendEventToSnapIn(event);
    } catch (error) {
      throw new Error(`Failed to send event to snap-in: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Assert initial response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.error).toBeUndefined();

    // Wait for async processing to complete
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Get callbacks from the callback server
    const callbacks = callbackServer.getCallbacks();
    
    if (callbacks.length === 0) {
      throw new Error('Expected to receive at least one callback, but received none. This indicates the extraction process did not complete or did not send callbacks to the callback server.');
    }

    // Find the EXTRACTION_DATA_DONE callback
    const dataExtractionCallbacks = callbacks.filter(callback => 
      callback.body && 
      callback.body.event_type === 'EXTRACTION_DATA_DONE'
    );

    if (dataExtractionCallbacks.length === 0) {
      const receivedEventTypes = callbacks
        .filter(cb => cb.body && cb.body.event_type)
        .map(cb => cb.body.event_type);
      
      throw new Error(
        `Expected to receive exactly one callback with event_type "EXTRACTION_DATA_DONE", but received none. ` +
        `Received callbacks with event_types: [${receivedEventTypes.join(', ')}]. ` +
        `Total callbacks received: ${callbacks.length}. ` +
        `Full callback data: ${JSON.stringify(callbacks, null, 2)}`
      );
    }

    if (dataExtractionCallbacks.length > 1) {
      throw new Error(
        `Expected to receive exactly one callback with event_type "EXTRACTION_DATA_DONE", but received ${dataExtractionCallbacks.length}. ` +
        `This indicates multiple completion events were sent. ` +
        `Full callback data: ${JSON.stringify(dataExtractionCallbacks, null, 2)}`
      );
    }

    const extractionDoneCallback = dataExtractionCallbacks[0];

    // Validate the callback structure
    if (!extractionDoneCallback.body.event_data) {
      throw new Error(
        `Expected callback to contain "event_data" field, but it was missing. ` +
        `Received callback body: ${JSON.stringify(extractionDoneCallback.body, null, 2)}`
      );
    }

    const eventData = extractionDoneCallback.body.event_data;
    
    if (!eventData.artifacts) {
      throw new Error(
        `Expected event_data to contain "artifacts" field, but it was missing. ` +
        `Received event_data: ${JSON.stringify(eventData, null, 2)}`
      );
    }

    const artifactArray = eventData.artifacts;

    if (!Array.isArray(artifactArray)) {
      throw new Error(
        `Expected "artifacts" to be an array, but received: ${typeof artifactArray}. ` +
        `Artifacts value: ${JSON.stringify(artifactArray, null, 2)}`
      );
    }

    if (artifactArray.length === 0) {
      throw new Error(
        `Expected artifacts array to contain at least one element (len(artifact_array) > 0), but it was empty. ` +
        `This indicates no data was extracted and uploaded.`
      );
    }

    // Find the users artifact
    const usersArtifact = artifactArray.find(artifact => 
      artifact && artifact.item_type === 'users'
    );

    if (!usersArtifact) {
      const availableItemTypes = artifactArray
        .filter(artifact => artifact && artifact.item_type)
        .map(artifact => artifact.item_type);
      
      throw new Error(
        `Expected to find an artifact with item_type "users", but none was found. ` +
        `Available item_types in artifacts: [${availableItemTypes.join(', ')}]. ` +
        `Total artifacts: ${artifactArray.length}. ` +
        `Full artifacts data: ${JSON.stringify(artifactArray, null, 2)}`
      );
    }

    // Validate users artifact item count
    if (usersArtifact.item_count === undefined || usersArtifact.item_count === null) {
      throw new Error(
        `Expected users artifact to have "item_count" field, but it was missing or null. ` +
        `Users artifact: ${JSON.stringify(usersArtifact, null, 2)}`
      );
    }

    if (usersArtifact.item_count !== 9) {
      throw new Error(
        `Expected users artifact to have item_count=9, but received item_count=${usersArtifact.item_count}. ` +
        `This indicates the wrong number of users were extracted. ` +
        `Users artifact: ${JSON.stringify(usersArtifact, null, 2)}`
      );
    }

    // All assertions passed
    expect(dataExtractionCallbacks).toHaveLength(1);
    expect(artifactArray.length).toBeGreaterThan(0);
    expect(usersArtifact.item_count).toBe(9);

  }, 45000);
});