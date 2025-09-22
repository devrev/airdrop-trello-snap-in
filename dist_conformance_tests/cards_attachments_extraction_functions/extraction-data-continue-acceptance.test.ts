import { TestUtils } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Extraction Function - Data Continue Acceptance Test', () => {
  let env: any;

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

  test('should extract cards and attachments with expected artifact counts using EXTRACTION_DATA_CONTINUE', async () => {
    // Load the test payload from JSON file
    const payloadPath = path.join(__dirname, 'data_extraction_continue_test_payload.json');
    
    if (!fs.existsSync(payloadPath)) {
      throw new Error(`Test payload file not found at: ${payloadPath}`);
    }

    const rawPayload = fs.readFileSync(payloadPath, 'utf8');
    let event;
    
    try {
      event = JSON.parse(rawPayload);
    } catch (error) {
      throw new Error(`Failed to parse test payload JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Replace placeholders with actual environment values
    const connectionKey = `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`;
    event.payload.connection_data.key = connectionKey;
    event.payload.connection_data.org_id = env.TRELLO_ORGANIZATION_ID;

    console.log('Sending EXTRACTION_DATA_CONTINUE event to snap-in...');
    
    // Send the event to the snap-in
    const response = await TestUtils.sendEventToSnapIn(event);
    
    // Verify the snap-in accepted the request
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    
    console.log('Snap-in response:', response.function_result.message);
    console.log('Waiting for extraction process to complete...');
    
    // Wait for the extraction process to complete (up to 60 seconds)
    const maxWaitTime = 60000; // 60 seconds
    const pollInterval = 1000; // 1 second
    let waitTime = 0;
    let callbackData: any[] = [];
    
    while (waitTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      waitTime += pollInterval;
      
      callbackData = TestUtils.getCallbackData();
      
      // Check if we received any callback events
      if (callbackData.length > 0) {
        console.log(`Received ${callbackData.length} callback event(s) after ${waitTime}ms`);
        
        // Log all received events for debugging
        callbackData.forEach((event, index) => {
          console.log(`Callback event ${index + 1}:`, JSON.stringify(event, null, 2));
        });
        
        // Check if we have the final event
        const finalEvent = callbackData[callbackData.length - 1];
        if (finalEvent.event_type === 'EXTRACTION_DATA_DONE') {
          console.log('Extraction completed successfully');
          break;
        } else if (finalEvent.event_type === 'EXTRACTION_DATA_ERROR') {
          throw new Error(`Extraction failed with error: ${JSON.stringify(finalEvent.error || finalEvent, null, 2)}`);
        }
      }
    }
    
    // Verify we received callback data
    if (callbackData.length === 0) {
      throw new Error(`No callback events received within ${maxWaitTime}ms. Expected at least one callback event with EXTRACTION_DATA_DONE.`);
    }
    
    // Verify we received exactly one callback event
    if (callbackData.length !== 1) {
      throw new Error(`Expected exactly 1 callback event, but received ${callbackData.length}. Events: ${JSON.stringify(callbackData.map(e => e.event_type), null, 2)}`);
    }
    
    const callbackEvent = callbackData[0];
    
    // Verify the event type is EXTRACTION_DATA_DONE
    if (callbackEvent.event_type !== 'EXTRACTION_DATA_DONE') {
      throw new Error(`Expected callback event_type to be 'EXTRACTION_DATA_DONE', but received '${callbackEvent.event_type}'. Full event: ${JSON.stringify(callbackEvent, null, 2)}`);
    }
    
    // Verify event_data exists
    if (!callbackEvent.event_data) {
      throw new Error(`Expected callback event to have 'event_data' property, but it was missing. Full event: ${JSON.stringify(callbackEvent, null, 2)}`);
    }
    
    // Verify artifacts array exists
    const artifactArray = callbackEvent.event_data.artifacts;
    if (!Array.isArray(artifactArray)) {
      throw new Error(`Expected 'event_data.artifacts' to be an array, but received: ${typeof artifactArray}. event_data: ${JSON.stringify(callbackEvent.event_data, null, 2)}`);
    }
    
    console.log(`Found ${artifactArray.length} artifacts in the callback event`);
    
    // Find cards artifact
    const cardsArtifact = artifactArray.find(artifact => artifact.item_type === 'cards');
    if (!cardsArtifact) {
      const availableItemTypes = artifactArray.map(a => a.item_type);
      throw new Error(`Expected to find an artifact with item_type 'cards', but only found: [${availableItemTypes.join(', ')}]. Full artifacts: ${JSON.stringify(artifactArray, null, 2)}`);
    }
    
    // Verify cards artifact item_count
    if (cardsArtifact.item_count !== 150) {
      throw new Error(`Expected cards artifact to have item_count=150, but received item_count=${cardsArtifact.item_count}. Cards artifact: ${JSON.stringify(cardsArtifact, null, 2)}`);
    }
    
    console.log('✓ Cards artifact validation passed: item_count=150');
    
    // Find attachments artifact
    const attachmentsArtifact = artifactArray.find(artifact => artifact.item_type === 'attachments');
    if (!attachmentsArtifact) {
      const availableItemTypes = artifactArray.map(a => a.item_type);
      throw new Error(`Expected to find an artifact with item_type 'attachments', but only found: [${availableItemTypes.join(', ')}]. Full artifacts: ${JSON.stringify(artifactArray, null, 2)}`);
    }
    
    // Verify attachments artifact item_count
    if (attachmentsArtifact.item_count !== 2) {
      throw new Error(`Expected attachments artifact to have item_count=2, but received item_count=${attachmentsArtifact.item_count}. Attachments artifact: ${JSON.stringify(attachmentsArtifact, null, 2)}`);
    }
    
    console.log('✓ Attachments artifact validation passed: item_count=2');
    console.log('✓ All acceptance test criteria satisfied for EXTRACTION_DATA_CONTINUE');
    
  }, 70000); // 70 second timeout to allow for extraction processing
});