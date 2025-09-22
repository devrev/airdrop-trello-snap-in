import { 
  getTestEnvironment, 
  setupCallbackServer, 
  createIncrementalTestEvent, 
  sendEventToSnapIn,
  waitForCondition,
  TestEnvironment,
  CallbackServerSetup,
  updateLastSuccessfulSync,
  updateTrelloCard,
  generateUUID,
  validateCallbackEvent,
  getSyncUnitIdFromTestData
} from './test-utils';

describe('Incremental Data Synchronization - Acceptance Test', () => {
  let env: TestEnvironment;
  let callbackServer: CallbackServerSetup;

  beforeAll(async () => {
    env = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await callbackServer.cleanup();
    }
  });

  beforeEach(() => {
    callbackServer.receivedEvents.length = 0;
  });

  describe('Environment Setup', () => {
    test('should have all required environment variables', () => {
      expect(env.TRELLO_API_KEY).toBeDefined();
      expect(env.TRELLO_TOKEN).toBeDefined();
      expect(env.TRELLO_ORGANIZATION_ID).toBeDefined();
      
      expect(env.TRELLO_API_KEY).not.toBe('');
      expect(env.TRELLO_TOKEN).not.toBe('');
      expect(env.TRELLO_ORGANIZATION_ID).not.toBe('');
    });
  });

  describe('Full Incremental Sync Workflow - Acceptance Test', () => {
    test('should complete the 3-step acceptance test flow with exact validation requirements', async () => {
      const testUuid = generateUUID();
      const syncUnitId = getSyncUnitIdFromTestData();
      const cardId = "688725db990240b77167efef"; // From acceptance test specification
      
      console.log(`Starting acceptance test with UUID: ${testUuid}`);
      console.log(`Using sync_unit_id: ${syncUnitId}`);
      console.log(`Using card_id: ${cardId}`);
      
      try {
        // Step 1: Update last successful sync state
        console.log('=== STEP 1: Updating last successful sync state ===');
        const updateStateResponse = await updateLastSuccessfulSync(syncUnitId, {
          snap_in_version_id: "test-version-id",
          extend_state: {
            users: { completed: true },
            cards: { completed: true },
            attachments: { completed: true }
          }
        });
        
        if (!updateStateResponse.success) {
          throw new Error(`Step 1 failed: ${updateStateResponse.error}`);
        }
        
        console.log('Step 1 completed successfully - Last successful sync state updated');

        // Step 2: Update Trello card to trigger incremental sync
        console.log('=== STEP 2: Updating Trello card ===');
        const cardName = `Card1-${testUuid}`;
        const updateCardResponse = await updateTrelloCard(env, cardId, cardName);
        
        if (!updateCardResponse.success) {
          throw new Error(`Step 2 failed: ${updateCardResponse.error}`);
        }
        
        console.log(`Step 2 completed successfully - Card updated with name: ${cardName}`);

        // Wait a moment to ensure the card update is processed by Trello
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 3: Execute extraction function and validate callback events
        console.log('=== STEP 3: Executing extraction function and validating results ===');
        const event = createIncrementalTestEvent(env);
        
        console.log('Sending extraction event to snap-in server...');
        const response = await sendEventToSnapIn(event);
        
        if (!response) {
          throw new Error('Step 3 failed: No response from snap-in server');
        }
        
        if (response.error) {
          throw new Error(`Step 3 failed: Snap-in server returned error: ${JSON.stringify(response.error)}`);
        }
        
        if (!response.function_result) {
          throw new Error('Step 3 failed: No function_result in response');
        }
        
        if (!response.function_result.success) {
          throw new Error(`Step 3 failed: Function execution failed: ${response.function_result.message}`);
        }
        
        console.log('Extraction function initiated successfully, waiting for callback events...');

        // Wait for callback server to receive the EXTRACTION_DATA_DONE event
        await waitForCondition(
          () => {
            const doneEvents = callbackServer.receivedEvents.filter(event => 
              event.body?.event_type === 'EXTRACTION_DATA_DONE'
            );
            return doneEvents.length > 0;
          },
          90000, // 90 second timeout
          2000   // Check every 2 seconds
        );

        console.log('Callback events received, performing validation...');

        // Validate callback events according to acceptance test specification
        const callbackEvents = callbackServer.receivedEvents;
        console.log(`Total callback events received: ${callbackEvents.length}`);
        
        if (callbackEvents.length === 0) {
          throw new Error('Step 3 failed: No callback events received from DevRev');
        }
        
        // Find the EXTRACTION_DATA_DONE event
        const doneEvents = callbackEvents.filter(event => 
          event.body?.event_type === 'EXTRACTION_DATA_DONE'
        );
        
        if (doneEvents.length === 0) {
          const eventTypes = callbackEvents.map(e => e.body?.event_type).join(', ');
          throw new Error(`Step 3 failed: Expected single EXTRACTION_DATA_DONE event, but received events: [${eventTypes}]`);
        }
        
        if (doneEvents.length > 1) {
          throw new Error(`Step 3 failed: Expected single EXTRACTION_DATA_DONE event, but received ${doneEvents.length} EXTRACTION_DATA_DONE events`);
        }
        
        const doneEvent = doneEvents[0];
        console.log('EXTRACTION_DATA_DONE event found, validating artifacts...');
        
        // Validate the event structure and artifacts according to acceptance test specification
        const validationResult = validateCallbackEvent(doneEvent, {
          expectedEventType: 'EXTRACTION_DATA_DONE',
          expectedCardsCount: 1,
          expectedAttachmentsCount: 2,
          shouldHaveUsers: false
        });
        
        if (!validationResult.isValid) {
          console.error('Callback event validation failed:');
          validationResult.errors.forEach(error => console.error(`  - ${error}`));
          console.error('Full callback event:', JSON.stringify(doneEvent, null, 2));
          throw new Error(`Step 3 failed: Callback event validation failed: ${validationResult.errors.join('; ')}`);
        }
        
        console.log('=== ACCEPTANCE TEST COMPLETED SUCCESSFULLY ===');
        console.log('All validation requirements met:');
        console.log('  ✓ Single EXTRACTION_DATA_DONE event received');
        console.log('  ✓ Cards artifact present with item_count=1');
        console.log('  ✓ Attachments artifact present with item_count=2');
        console.log('  ✓ No users artifact present (correct incremental behavior)');
        
        // Final assertions for Jest
        expect(validationResult.isValid).toBe(true);
        expect(doneEvents.length).toBe(1);
        
        const artifacts = doneEvent.body.event_data.artifacts;
        expect(Array.isArray(artifacts)).toBe(true);
        expect(artifacts.length).toBeGreaterThan(0);
        
        const cardsArtifact = artifacts.find((a: any) => a.item_type === 'cards');
        expect(cardsArtifact).toBeDefined();
        expect(cardsArtifact.item_count).toBe(1);
        
        const attachmentsArtifact = artifacts.find((a: any) => a.item_type === 'attachments');
        expect(attachmentsArtifact).toBeDefined();
        expect(attachmentsArtifact.item_count).toBe(2);
        
        const usersArtifact = artifacts.find((a: any) => a.item_type === 'users');
        expect(usersArtifact).toBeUndefined();
        
      } catch (error) {
        console.error('=== ACCEPTANCE TEST FAILED ===');
        console.error('Error details:', error);
        console.error('Callback events received:', JSON.stringify(callbackServer.receivedEvents, null, 2));
        throw error;
      }
    }, 120000); // 2 minute timeout for the full acceptance test
  });
});