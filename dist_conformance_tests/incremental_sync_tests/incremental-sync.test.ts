import {
  getCredentials,
  generateUUID,
  loadEventFixture,
  setupCallbackServer,
  invokeSnapIn,
  waitForCallback,
  updateLastSuccessfulSync,
  updateTrelloCard,
  CallbackEvent,
} from './test-helpers';
import * as fs from 'fs';
import * as path from 'path';

describe('Incremental Data Synchronization', () => {
  let callbackServer: any;
  let credentials: any;
  let eventFixture: any;

  beforeAll(() => {
    // Load credentials from environment
    credentials = getCredentials();

    // Load event fixture
    const fixturePath = path.join(__dirname, 'fixtures', 'incremental-sync-event.json');
    const fixtureContent = fs.readFileSync(fixturePath, 'utf-8');
    const rawFixture = JSON.parse(fixtureContent);
    eventFixture = loadEventFixture(rawFixture, credentials);
  });

  afterEach(async () => {
    // Cleanup callback server
    if (callbackServer) {
      await callbackServer.close();
      callbackServer = null;
    }
  });

  test('should extract only modified cards and their attachments in incremental mode', async () => {
    // Step 1: Set complete extraction state
    const syncUnitId = eventFixture.payload.event_context.sync_unit_id;
    const completeState = {
      users: { completed: true },
      labels: { completed: true },
      cards: { completed: true },
      comments: { completed: true },
      attachments: { completed: true },
    };

    console.log('Step 1: Setting complete extraction state...');
    console.log('Sync Unit ID:', syncUnitId);
    console.log('Complete State:', JSON.stringify(completeState, null, 2));
    await updateLastSuccessfulSync(syncUnitId, completeState);
    console.log('✓ Complete extraction state set successfully');

    // Step 2: Modify a card in Trello
    const uuid = generateUUID();
    const cardId = '68e8befc8381b0efa25ce1eb';
    const newCardName = `Card1-${uuid}`;

    console.log(`\nStep 2: Updating Trello card ${cardId} with name "${newCardName}"...`);
    await updateTrelloCard(cardId, newCardName, credentials);
    console.log('✓ Trello card updated successfully');

    // Step 3: Setup callback server and invoke extraction function
    console.log('\nStep 3: Setting up callback server and invoking extraction function...');
    callbackServer = await setupCallbackServer();
    console.log('✓ Callback server listening on port 8002');

    console.log('Invoking extraction function with event:');
    console.log('  - Event Type:', eventFixture.payload.event_type);
    console.log('  - Mode:', eventFixture.payload.event_context.mode);
    console.log('  - External Sync Unit ID:', eventFixture.payload.event_context.external_sync_unit_id);
    
    await invokeSnapIn(eventFixture);
    console.log('✓ Extraction function invoked successfully');
    console.log('Waiting for callback event (timeout: 60 seconds)...');

    // Wait for callback with 60-second timeout
    const events = await waitForCallback(callbackServer.getEvents, 1, 60000);
    console.log(`✓ Received ${events.length} callback event(s)`);

    // Step 4: Validate callback response
    console.log('\nStep 4: Validating callback response...');

    // Assert exactly one event received
    if (events.length !== 1) {
      throw new Error(
        `Expected to receive exactly 1 callback event, but received ${events.length} events. ` +
        `Events: ${JSON.stringify(events, null, 2)}`
      );
    }
    console.log('✓ Received exactly one callback event');

    const event = events[0];

    // Log full event for debugging
    console.log('\nFull callback event:');
    console.log(JSON.stringify(event, null, 2));

    // Assert event_type is EXTRACTION_DATA_DONE
    if (event.event_type !== 'EXTRACTION_DATA_DONE') {
      throw new Error(
        `Expected event_type to be 'EXTRACTION_DATA_DONE', but got '${event.event_type}'. ` +
        `Full event: ${JSON.stringify(event, null, 2)}`
      );
    }
    console.log('✓ Event type is EXTRACTION_DATA_DONE');

    // Extract artifacts array
    const artifacts = event.event_data?.artifacts;
    if (!artifacts) {
      throw new Error(
        `Expected event_data.artifacts to exist, but it was undefined. ` +
        `Full event_data: ${JSON.stringify(event.event_data, null, 2)}`
      );
    }

    if (!Array.isArray(artifacts)) {
      throw new Error(
        `Expected event_data.artifacts to be an array, but got ${typeof artifacts}. ` +
        `Value: ${JSON.stringify(artifacts, null, 2)}`
      );
    }

    if (artifacts.length === 0) {
      throw new Error(
        `Expected artifacts array to not be empty. ` +
        `Full event_data: ${JSON.stringify(event.event_data, null, 2)}`
      );
    }
    console.log(`✓ Artifacts array is not empty (${artifacts.length} artifact(s))`);

    // Log all artifacts for debugging
    console.log('\nArtifacts received:');
    artifacts.forEach((artifact: any, index: number) => {
      console.log(`  [${index}] item_type: ${artifact.item_type}, item_count: ${artifact.item_count}`);
    });

    // Find and validate cards artifact
    const cardsArtifact = artifacts.find((a: any) => a.item_type === 'cards');
    if (!cardsArtifact) {
      const availableTypes = artifacts.map((a: any) => a.item_type).join(', ');
      throw new Error(
        `Expected to find artifact with item_type='cards', but none found. ` +
        `Available item_types: [${availableTypes}]. ` +
        `Full artifacts: ${JSON.stringify(artifacts, null, 2)}`
      );
    }
    console.log('✓ Found cards artifact');

    // Assert cards artifact has item_count = 1
    if (cardsArtifact.item_count !== 1) {
      throw new Error(
        `Expected cards artifact to have item_count=1, but got ${cardsArtifact.item_count}. ` +
        `Full cards artifact: ${JSON.stringify(cardsArtifact, null, 2)}`
      );
    }
    console.log('✓ Cards artifact has item_count=1');

    // Find and validate attachments artifact
    const attachmentsArtifact = artifacts.find((a: any) => a.item_type === 'attachments');
    if (!attachmentsArtifact) {
      const availableTypes = artifacts.map((a: any) => a.item_type).join(', ');
      throw new Error(
        `Expected to find artifact with item_type='attachments', but none found. ` +
        `Available item_types: [${availableTypes}]. ` +
        `Attachments should be extracted in incremental mode when their parent cards are modified. ` +
        `Full artifacts: ${JSON.stringify(artifacts, null, 2)}`
      );
    }
    console.log('✓ Found attachments artifact');

    // Assert attachments artifact has item_count = 2
    if (attachmentsArtifact.item_count !== 2) {
      throw new Error(
        `Expected attachments artifact to have item_count=2, but got ${attachmentsArtifact.item_count}. ` +
        `The modified card (${cardId}) should have 2 attachments. ` +
        `Full attachments artifact: ${JSON.stringify(attachmentsArtifact, null, 2)}`
      );
    }
    console.log('✓ Attachments artifact has item_count=2');

    // Assert no users artifact
    const usersArtifact = artifacts.find((a: any) => a.item_type === 'users');
    if (usersArtifact) {
      throw new Error(
        `Found unexpected artifact with item_type='users' (item_count=${usersArtifact.item_count}). ` +
        `Users should not be extracted in incremental mode. ` +
        `Full users artifact: ${JSON.stringify(usersArtifact, null, 2)}`
      );
    }
    console.log('✓ No users artifact found (as expected)');

    // Assert no labels artifact
    const labelsArtifact = artifacts.find((a: any) => a.item_type === 'labels');
    if (labelsArtifact) {
      throw new Error(
        `Found unexpected artifact with item_type='labels' (item_count=${labelsArtifact.item_count}). ` +
        `Labels should not be extracted in incremental mode. ` +
        `Full labels artifact: ${JSON.stringify(labelsArtifact, null, 2)}`
      );
    }
    console.log('✓ No labels artifact found (as expected)');

    console.log('\n✅ All validations passed successfully!');
    console.log('Summary:');
    console.log('  - Cards extracted: 1 (modified card)');
    console.log('  - Attachments extracted: 2 (from modified card)');
    console.log('  - Users extracted: 0 (not re-extracted in incremental mode)');
    console.log('  - Labels extracted: 0 (not re-extracted in incremental mode)');
  }, 120000); // 120 second timeout
});