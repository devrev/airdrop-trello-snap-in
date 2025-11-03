import {
  setupCallbackServer,
  closeServer,
  invokeSnapInFunction,
  CallbackServerSetup,
  updateLastSuccessfulSync,
  updateTrelloCard,
  generateUniqueCardName,
  loadTestEventFromJson,
  getTestCredentials,
} from './test-helpers';

describe('Incremental Data Synchronization - Acceptance Test', () => {
  let callbackServer: CallbackServerSetup;
  const TEST_CARD_ID = '68e8befc8381b0efa25ce1eb';

  beforeAll(async () => {
    callbackServer = await setupCallbackServer(8002);
  });

  afterAll(async () => {
    await closeServer(callbackServer.server);
  });

  beforeEach(() => {
    callbackServer.receivedEvents.length = 0;
  });

  test('should extract only modified card and its attachments in incremental mode', async () => {
    console.log('=== Step 1: Update last successful sync state ===');
    
    // Load test event from JSON file
    const event = loadTestEventFromJson('./test-data/data_extraction_incremental_test.json');
    const syncUnitId = event.payload.event_context.sync_unit_id;
    const snapInVersionId = event.context.snap_in_version_id;
    
    console.log(`Sync Unit ID: ${syncUnitId}`);
    console.log(`Snap-in Version ID: ${snapInVersionId}`);
    
    // Update last successful sync state
    try {
      await updateLastSuccessfulSync({
        syncUnitId,
        snapInVersionId,
        extendState: {
          users: { completed: true },
          cards: { completed: true },
          attachments: { completed: true },
        },
      });
      console.log('✓ Successfully updated last successful sync state');
    } catch (error) {
      throw new Error(`Step 1 failed - Could not update last successful sync: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('\n=== Step 2: Update Trello card ===');
    
    const credentials = getTestCredentials();
    const uniqueCardName = generateUniqueCardName();
    console.log(`Updating card ${TEST_CARD_ID} with name: ${uniqueCardName}`);
    
    try {
      await updateTrelloCard({
        cardId: TEST_CARD_ID,
        name: uniqueCardName,
        apiKey: credentials.apiKey,
        token: credentials.token,
      });
      console.log('✓ Successfully updated Trello card');
    } catch (error) {
      throw new Error(`Step 2 failed - Could not update Trello card: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('\n=== Step 3: Invoke extraction function and validate results ===');
    
    try {
      // Invoke the extraction function
      console.log('Invoking extraction function with incremental mode...');
      await invokeSnapInFunction(event);
      
      // Wait for callback event
      console.log('Waiting for callback event...');
      const callbackEvent = await callbackServer.waitForEvent(60000);
      
      console.log(`Received callback event with type: ${callbackEvent.event_type}`);
      
      // Validate event type
      if (callbackEvent.event_type !== 'EXTRACTION_DATA_DONE') {
        throw new Error(
          `Step 3 failed - Expected event type 'EXTRACTION_DATA_DONE' but received '${callbackEvent.event_type}'. ` +
          `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
        );
      }
      console.log('✓ Received EXTRACTION_DATA_DONE event');
      
      // Extract artifacts array
      const artifactArray = callbackEvent.event_data?.artifacts;
      
      if (!artifactArray) {
        throw new Error(
          `Step 3 failed - No artifacts found in callback event. ` +
          `Event data: ${JSON.stringify(callbackEvent.event_data, null, 2)}`
        );
      }
      
      if (!Array.isArray(artifactArray)) {
        throw new Error(
          `Step 3 failed - Artifacts is not an array. Type: ${typeof artifactArray}. ` +
          `Value: ${JSON.stringify(artifactArray, null, 2)}`
        );
      }
      
      if (artifactArray.length === 0) {
        throw new Error(
          `Step 3 failed - Artifacts array is empty. Expected at least one artifact for cards. ` +
          `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
        );
      }
      console.log(`✓ Artifacts array contains ${artifactArray.length} artifact(s)`);
      
      // Find cards artifact
      const cardsArtifact = artifactArray.find((artifact: any) => artifact.item_type === 'cards');
      
      if (!cardsArtifact) {
        throw new Error(
          `Step 3 failed - No artifact with item_type='cards' found. ` +
          `Available item types: ${artifactArray.map((a: any) => a.item_type).join(', ')}. ` +
          `Full artifacts: ${JSON.stringify(artifactArray, null, 2)}`
        );
      }
      console.log(`✓ Found cards artifact with item_count: ${cardsArtifact.item_count}`);
      
      // Validate cards artifact item count
      if (cardsArtifact.item_count !== 1) {
        throw new Error(
          `Step 3 failed - Expected cards artifact to have item_count=1 (only the modified card) ` +
          `but found item_count=${cardsArtifact.item_count}. ` +
          `This indicates that more than one card was extracted in incremental mode. ` +
          `Cards artifact: ${JSON.stringify(cardsArtifact, null, 2)}`
        );
      }
      console.log('✓ Cards artifact has correct item_count=1');
      
      // Find attachments artifact
      const attachmentsArtifact = artifactArray.find((artifact: any) => artifact.item_type === 'attachments');
      
      if (!attachmentsArtifact) {
        throw new Error(
          `Step 3 failed - No artifact with item_type='attachments' found. ` +
          `Expected the modified card to have 2 attachments. ` +
          `Available item types: ${artifactArray.map((a: any) => a.item_type).join(', ')}. ` +
          `Full artifacts: ${JSON.stringify(artifactArray, null, 2)}`
        );
      }
      console.log(`✓ Found attachments artifact with item_count: ${attachmentsArtifact.item_count}`);
      
      // Validate attachments artifact item count
      if (attachmentsArtifact.item_count !== 2) {
        throw new Error(
          `Step 3 failed - Expected attachments artifact to have item_count=2 ` +
          `but found item_count=${attachmentsArtifact.item_count}. ` +
          `This indicates that the modified card does not have exactly 2 attachments. ` +
          `Attachments artifact: ${JSON.stringify(attachmentsArtifact, null, 2)}`
        );
      }
      console.log('✓ Attachments artifact has correct item_count=2');
      
      // Validate no users artifact
      const usersArtifact = artifactArray.find((artifact: any) => artifact.item_type === 'users');
      
      if (usersArtifact) {
        throw new Error(
          `Step 3 failed - Found unexpected artifact with item_type='users'. ` +
          `In incremental mode, users should not be re-extracted as they were already completed. ` +
          `Users artifact: ${JSON.stringify(usersArtifact, null, 2)}`
        );
      }
      console.log('✓ No users artifact found (as expected)');
      
      console.log('\n=== All validations passed ===');
      console.log('Summary:');
      console.log('- Only 1 card was extracted (the modified one)');
      console.log('- Exactly 2 attachments were extracted (from the modified card)');
      console.log('- No users were extracted');
      console.log('- Incremental sync worked correctly');
      
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Step 3 failed')) {
        throw error;
      }
      throw new Error(
        `Step 3 failed - Unexpected error during extraction or validation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, 120000);
});