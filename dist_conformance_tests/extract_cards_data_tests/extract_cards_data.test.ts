import {
  readCredentials,
  buildConnectionDataKey,
  setupCallbackServer,
  sendEventToSnapIn,
  waitForCallbackEvent,
} from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Extract Cards Data - Acceptance Test', () => {
  let cleanup: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  });

  test('should extract all 12 cards with proper pagination', async () => {
    // Read credentials from environment
    const { apiKey, token, orgId } = readCredentials();

    // Setup callback server
    const { eventPromise, cleanup: cleanupServer } = setupCallbackServer(8002);
    cleanup = cleanupServer;

    // Load and modify test payload
    const payloadPath = path.join(__dirname, 'extract_cards_data_payload.json');
    const payloadTemplate = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));

    // Replace placeholders with actual credentials
    const connectionDataKey = buildConnectionDataKey(apiKey, token);
    payloadTemplate.payload.connection_data.key = connectionDataKey;
    payloadTemplate.payload.connection_data.org_id = orgId;

    // Send event to snap-in server
    console.log('Sending EXTRACTION_DATA_START event to snap-in server...');
    await sendEventToSnapIn(payloadTemplate);

    // Wait for callback event
    console.log('Waiting for callback event from DevRev...');
    const callbackEvent = await waitForCallbackEvent(eventPromise, 100000);

    // Validation 1: Check that we received exactly one event
    expect(callbackEvent).toBeDefined();
    console.log('Received callback event:', JSON.stringify(callbackEvent, null, 2));

    // Validation 2: Check event_type is EXTRACTION_DATA_DONE
    const eventType = callbackEvent.event_type;
    if (eventType !== 'EXTRACTION_DATA_DONE') {
      throw new Error(
        `Expected event_type to be 'EXTRACTION_DATA_DONE', but got '${eventType}'. ` +
        `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    // Validation 3: Check artifacts array exists and has length > 0
    const artifacts = callbackEvent.event_data?.artifacts;
    if (!Array.isArray(artifacts)) {
      throw new Error(
        `Expected event_data.artifacts to be an array, but got ${typeof artifacts}. ` +
        `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    if (artifacts.length === 0) {
      throw new Error(
        `Expected artifacts array to have length > 0, but got 0. ` +
        `Full event: ${JSON.stringify(callbackEvent, null, 2)}`
      );
    }

    console.log(`Found ${artifacts.length} artifacts:`, artifacts.map((a: any) => ({
      item_type: a.item_type,
      item_count: a.item_count,
    })));

    // Validation 4: Find cards artifact
    const cardsArtifact = artifacts.find((artifact: any) => artifact.item_type === 'cards');
    if (!cardsArtifact) {
      const availableTypes = artifacts.map((a: any) => a.item_type).join(', ');
      throw new Error(
        `Expected to find a cards artifact, but none found. ` +
        `Available artifact types: [${availableTypes}]. ` +
        `Full artifacts: ${JSON.stringify(artifacts, null, 2)}`
      );
    }

    // Validation 5: Check item_count is 12 (not 10, which would indicate incomplete pagination)
    const itemCount = cardsArtifact.item_count;
    if (itemCount !== 12) {
      let errorMessage = `Expected cards artifact to have item_count=12, but got ${itemCount}. `;
      
      if (itemCount === 10) {
        errorMessage += 
          `This indicates incomplete pagination: only one page (10 cards) was fetched instead of all pages. ` +
          `The extraction function should continue fetching pages until all 12 cards are retrieved. ` +
          `Check the pagination logic in data-extraction-phases.ts to ensure it fetches all pages.`;
      } else if (itemCount < 12) {
        errorMessage += 
          `This indicates incomplete extraction: only ${itemCount}/12 cards were extracted. ` +
          `The extraction function should continue until all cards are fetched.`;
      } else {
        errorMessage += 
          `This indicates more cards were extracted than expected. ` +
          `Expected exactly 12 cards from the test board.`;
      }
      
      errorMessage += ` Full cards artifact: ${JSON.stringify(cardsArtifact, null, 2)}`;
      throw new Error(errorMessage);
    }

    console.log(`✓ Successfully validated: cards artifact has item_count=12`);
    console.log(`✓ All 12 cards were extracted with proper pagination`);
  }, 120000); // 120 second timeout
});