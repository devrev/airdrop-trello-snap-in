import { CallbackServer, getTestEnvironment, sendEventToSnapIn, updateLastSuccessfulSync, updateTrelloCard, generateUUID, validateIncrementalCallbackResponse } from './test-utils';
import dataExtractionIncrementalTestData from './data_extraction_incremental_test.json';

describe('Incremental Mode Acceptance Test', () => {
  let callbackServer: CallbackServer;
  let env: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    env = getTestEnvironment();
    callbackServer = new CallbackServer();
    await callbackServer.start(8002);
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  beforeEach(() => {
    callbackServer.clearRequests();
  });

  test('should validate incremental mode with complete flow', async () => {
    const testUuid = generateUUID();
    const syncUnitId = dataExtractionIncrementalTestData[0].payload.event_context.sync_unit_id;
    
    console.log(`Starting incremental mode acceptance test with UUID: ${testUuid}`);
    console.log(`Using sync unit ID: ${syncUnitId}`);

    // Step 1: Update last successful sync state
    console.log('Step 1: Updating last successful sync state...');
    try {
      await updateLastSuccessfulSync(syncUnitId, {
        snap_in_version_id: "test-version-id",
        extend_state: {
          users: { completed: true },
          cards: { completed: true },
          attachments: { completed: true }
        }
      });
      console.log('Step 1 completed successfully');
    } catch (error) {
      throw new Error(`Step 1 failed - Could not update last successful sync state: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 2: Update Trello card to trigger incremental sync
    console.log('Step 2: Updating Trello card...');
    const cardName = `Card1-${testUuid}`;
    try {
      const updateResponse = await updateTrelloCard('688725db990240b77167efef', cardName, env);
      console.log(`Step 2 completed successfully - Card updated with name: ${cardName}`);
      console.log(`Trello API response status: ${updateResponse.status}`);
    } catch (error) {
      throw new Error(`Step 2 failed - Could not update Trello card: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 3: Invoke extraction function and validate response
    console.log('Step 3: Invoking extraction function...');
    
    // Create event from test data with proper credentials
    const event = { ...dataExtractionIncrementalTestData[0] };
    event.payload.connection_data.key = `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`;
    event.payload.connection_data.org_id = env.TRELLO_ORGANIZATION_ID;

    try {
      const response = await sendEventToSnapIn(event);
      console.log('Extraction function invoked successfully');
      console.log(`Response: ${JSON.stringify(response, null, 2)}`);

      // Validate the snap-in response
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      expect(response.error).toBeUndefined();

    } catch (error) {
      throw new Error(`Step 3 failed - Could not invoke extraction function: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Wait for callback from DevRev
    console.log('Waiting for callback from DevRev...');
    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds for callback

    const callbackRequests = callbackServer.getRequests();
    console.log(`Received ${callbackRequests.length} callback requests`);
    
    if (callbackRequests.length === 0) {
      throw new Error('Step 3 validation failed - No callback requests received from DevRev server');
    }

    // Log all callback requests for debugging
    callbackRequests.forEach((request, index) => {
      console.log(`Callback request ${index + 1}:`, JSON.stringify(request, null, 2));
    });

    // Validate callback response according to acceptance test requirements
    try {
      const validationResult = validateIncrementalCallbackResponse(callbackRequests);
      console.log('Step 3 completed successfully - Callback validation passed');
      console.log(`Validation result: ${JSON.stringify(validationResult, null, 2)}`);
    } catch (error) {
      throw new Error(`Step 3 validation failed - ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('Incremental mode acceptance test completed successfully');
  }, 120000); // 2 minute timeout
});