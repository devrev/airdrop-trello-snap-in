import { 
  getTestEnvironment, 
  setupCallbackServer, 
  closeCallbackServer, 
  sendEventToSnapIn,
  CallbackServerSetup,
  TestEnvironment 
} from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Extraction Function - Data Done Callback', () => {
  let env: TestEnvironment;
  let callbackServer: CallbackServerSetup;

  beforeAll(async () => {
    env = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await closeCallbackServer(callbackServer);
    }
  });

  beforeEach(() => {
    // Clear received callbacks before each test
    callbackServer.receivedCallbacks.length = 0;
  });

  function loadAndPrepareTestEvent(): any {
    try {
      const testDataPath = path.join(__dirname, 'data_extraction_test.json');
      
      if (!fs.existsSync(testDataPath)) {
        throw new Error(`Test data file not found at: ${testDataPath}`);
      }

      const testDataContent = fs.readFileSync(testDataPath, 'utf8');
      const testEvents = JSON.parse(testDataContent);
      
      if (!Array.isArray(testEvents) || testEvents.length === 0) {
        throw new Error('Test data file should contain an array with at least one event');
      }

      const event = testEvents[0];
      
      // Replace credential placeholders with actual values
      const eventStr = JSON.stringify(event)
        .replace(/<TRELLO_API_KEY>/g, env.TRELLO_API_KEY)
        .replace(/<TRELLO_TOKEN>/g, env.TRELLO_TOKEN)
        .replace(/<TRELLO_ORGANIZATION_ID>/g, env.TRELLO_ORGANIZATION_ID);
      
      return JSON.parse(eventStr);
    } catch (error) {
      throw new Error(`Failed to load and prepare test event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function waitForCallback(timeoutMs: number = 60000): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkForCallback = () => {
        const elapsedTime = Date.now() - startTime;
        
        if (callbackServer.receivedCallbacks.length > 0) {
          resolve(callbackServer.receivedCallbacks[0]);
          return;
        }
        
        if (elapsedTime >= timeoutMs) {
          reject(new Error(
            `Timeout waiting for callback after ${timeoutMs}ms. ` +
            `Received ${callbackServer.receivedCallbacks.length} callbacks. ` +
            `Expected at least 1 callback with event_type "EXTRACTION_DATA_DONE".`
          ));
          return;
        }
        
        setTimeout(checkForCallback, 1000);
      };
      
      checkForCallback();
    });
  }

  test('should receive EXTRACTION_DATA_DONE callback with users artifact containing 9 items', async () => {
    // Load and prepare the test event
    const event = loadAndPrepareTestEvent();
    
    console.log('Sending extraction event to snap-in server...');
    
    // Send the event to the snap-in server
    const response = await sendEventToSnapIn(event);
    
    // Verify the function was invoked successfully
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    
    if (response.data.error) {
      throw new Error(`Snap-in function returned error: ${JSON.stringify(response.data.error, null, 2)}`);
    }
    
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    
    console.log('Snap-in function invoked successfully, waiting for callback...');
    
    // Wait for the callback from DevRev
    const callback = await waitForCallback(90000); // 90 seconds timeout
    
    console.log('Received callback:', JSON.stringify(callback, null, 2));
    
    // Verify callback structure
    expect(callback).toBeDefined();
    expect(callback.body).toBeDefined();
    
    const callbackBody = callback.body;
    
    // Verify event_type is EXTRACTION_DATA_DONE
    if (!callbackBody.event_type) {
      throw new Error(
        `Callback missing event_type field. Received callback body: ${JSON.stringify(callbackBody, null, 2)}`
      );
    }
    
    expect(callbackBody.event_type).toBe('EXTRACTION_DATA_DONE');
    
    // Verify event_data exists
    if (!callbackBody.event_data) {
      throw new Error(
        `Callback missing event_data field. Received callback body: ${JSON.stringify(callbackBody, null, 2)}`
      );
    }
    
    // Verify artifacts array exists
    const artifactArray = callbackBody.event_data.artifacts;
    if (!artifactArray) {
      throw new Error(
        `Callback event_data missing artifacts field. ` +
        `Received event_data: ${JSON.stringify(callbackBody.event_data, null, 2)}`
      );
    }
    
    if (!Array.isArray(artifactArray)) {
      throw new Error(
        `Callback event_data.artifacts is not an array. ` +
        `Received artifacts: ${JSON.stringify(artifactArray, null, 2)}`
      );
    }
    
    // Verify artifacts array is not empty
    expect(artifactArray.length).toBeGreaterThan(0);
    
    console.log(`Found ${artifactArray.length} artifacts:`, artifactArray.map(a => ({ item_type: a.item_type, item_count: a.item_count })));
    
    // Find users artifact
    const usersArtifact = artifactArray.find(artifact => artifact.item_type === 'users');
    
    if (!usersArtifact) {
      const availableItemTypes = artifactArray.map(a => a.item_type).join(', ');
      throw new Error(
        `No artifact with item_type "users" found in artifacts array. ` +
        `Available item_types: [${availableItemTypes}]. ` +
        `Full artifacts array: ${JSON.stringify(artifactArray, null, 2)}`
      );
    }
    
    console.log('Found users artifact:', usersArtifact);
    
    // Verify users artifact has item_count field
    if (typeof usersArtifact.item_count !== 'number') {
      throw new Error(
        `Users artifact missing or invalid item_count field. ` +
        `Expected number, got: ${typeof usersArtifact.item_count}. ` +
        `Users artifact: ${JSON.stringify(usersArtifact, null, 2)}`
      );
    }
    
    // Verify users artifact has exactly 9 items
    if (usersArtifact.item_count !== 9) {
      throw new Error(
        `Users artifact item_count is ${usersArtifact.item_count}, expected 9. ` +
        `This indicates that not all users data was extracted. ` +
        `Users artifact: ${JSON.stringify(usersArtifact, null, 2)}`
      );
    }
    
    expect(usersArtifact.item_count).toBe(9);
    
    console.log('✅ All assertions passed: Received EXTRACTION_DATA_DONE callback with users artifact containing 9 items');
  }, 120000);
});