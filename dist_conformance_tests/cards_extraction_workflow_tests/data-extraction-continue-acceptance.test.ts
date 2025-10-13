import { TestUtils } from './test-utils';
import * as fs from 'fs';
import * as path from 'path';

describe('Data Extraction Continue Acceptance Test', () => {
  let env: ReturnType<typeof TestUtils.getEnvironment>;

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

  /**
   * Creates the test event from the JSON payload file with credential replacement
   */
  function createTestEvent() {
    try {
      // Read the JSON payload file
      const payloadPath = path.join(__dirname, 'data-extraction-continue-test-payload.json');
      const payloadContent = fs.readFileSync(payloadPath, 'utf8');
      
      // Replace placeholders with actual credentials
      const replacedContent = payloadContent
        .replace(/<TRELLO_API_KEY>/g, env.trelloApiKey)
        .replace(/<TRELLO_TOKEN>/g, env.trelloToken)
        .replace(/<TRELLO_ORGANIZATION_ID>/g, env.trelloOrganizationId);
      
      const event = JSON.parse(replacedContent);
      
      // Validate that the event has the expected structure
      if (!event.payload || !event.context || !event.execution_metadata) {
        throw new Error('Invalid event structure: missing required top-level properties');
      }
      
      if (!event.payload.event_type) {
        throw new Error('Invalid event structure: missing event_type in payload');
      }
      
      if (event.payload.event_type !== 'EXTRACTION_DATA_CONTINUE') {
        throw new Error(`Invalid event structure: expected event_type 'EXTRACTION_DATA_CONTINUE', got '${event.payload.event_type}'`);
      }
      
      if (!event.payload.connection_data || !event.payload.connection_data.key) {
        throw new Error('Invalid event structure: missing connection_data.key in payload');
      }
      
      return event;
    } catch (error) {
      throw new Error(`Failed to create test event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  describe('Acceptance Test: Data Extraction Continue with 12 Cards', () => {
    it('should continue data extraction and return EXTRACTION_DATA_DONE with 12 cards', async () => {
      // Create the test event with replaced credentials
      const event = createTestEvent();
      
      console.log('Sending EXTRACTION_DATA_CONTINUE event to snap-in server...');
      console.log('Event payload summary:', {
        event_type: event.payload.event_type,
        external_sync_unit_id: event.payload.event_context.external_sync_unit_id,
        external_sync_unit_name: event.payload.event_context.external_sync_unit_name,
        org_id: event.payload.connection_data.org_id,
      });
      
      // Send event to snap-in server
      const response = await TestUtils.sendEventToSnapIn(event);
      
      // Validate that the snap-in accepted the event
      if (response.error) {
        throw new Error(
          `Snap-in server returned error: ${JSON.stringify(response.error, null, 2)}`
        );
      }
      
      console.log('Event sent successfully, waiting for callback...');
      
      // Wait for callback from DevRev (extended timeout for data extraction)
      let callbacks: any[];
      try {
        callbacks = await TestUtils.waitForCallback(30000); // 30 second timeout
      } catch (error) {
        throw new Error(
          `No callback received from DevRev within timeout. ` +
          `This indicates the extraction function may not be working correctly. ` +
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      
      console.log(`Received ${callbacks.length} callback(s) from DevRev:`, 
        callbacks.map(cb => ({ event_type: cb.event_type, has_event_data: !!cb.event_data })));
      
      // Validate that we received exactly one callback
      if (callbacks.length === 0) {
        throw new Error(
          'Expected to receive at least one callback from DevRev, but received none. ' +
          'This indicates the extraction function is not communicating with DevRev properly.'
        );
      }
      
      // Validate that we received exactly one callback (as per specification)
      if (callbacks.length !== 1) {
        throw new Error(
          `Expected to receive exactly one callback from DevRev, but received ${callbacks.length}. ` +
          `All callbacks received: ${JSON.stringify(callbacks.map(cb => ({ 
            event_type: cb.event_type, 
            event_data: cb.event_data 
          })), null, 2)}`
        );
      }
      
      const callback = callbacks[0];
      
      // Validate that the single callback is EXTRACTION_DATA_DONE
      if (callback.event_type !== 'EXTRACTION_DATA_DONE') {
        if (callback.event_type === 'EXTRACTION_DATA_ERROR') {
          throw new Error(
            `Expected EXTRACTION_DATA_DONE callback but received EXTRACTION_DATA_ERROR instead. ` +
            `Error details: ${JSON.stringify(callback.event_data, null, 2)}`
          );
        }
        
        if (callback.event_type === 'EXTRACTION_DATA_PROGRESS') {
          throw new Error(
            `Expected EXTRACTION_DATA_DONE callback but received EXTRACTION_DATA_PROGRESS instead. ` +
            `This indicates the extraction may have timed out or is incomplete. ` +
            `Progress callback details: ${JSON.stringify(callback.event_data, null, 2)}`
          );
        }
        
        throw new Error(
          `Expected EXTRACTION_DATA_DONE callback but received '${callback.event_type}' instead. ` +
          `Full callback: ${JSON.stringify(callback, null, 2)}`
        );
      }
      
      console.log('Found EXTRACTION_DATA_DONE callback, validating artifacts...');
      
      // Validate the callback has event_data
      if (!callback.event_data) {
        throw new Error(
          `EXTRACTION_DATA_DONE callback is missing event_data. ` +
          `Full callback: ${JSON.stringify(callback, null, 2)}`
        );
      }
      
      // Validate the artifacts array exists
      const artifactArray = callback.event_data.artifacts;
      if (!artifactArray) {
        throw new Error(
          `EXTRACTION_DATA_DONE callback is missing artifacts array in event_data. ` +
          `Available event_data keys: ${Object.keys(callback.event_data)}. ` +
          `Full event_data: ${JSON.stringify(callback.event_data, null, 2)}`
        );
      }
      
      if (!Array.isArray(artifactArray)) {
        throw new Error(
          `Expected artifacts to be an array, but got ${typeof artifactArray}. ` +
          `Artifacts value: ${JSON.stringify(artifactArray, null, 2)}`
        );
      }
      
      // Validate artifacts array length > 0
      if (artifactArray.length === 0) {
        throw new Error(
          'Expected artifacts array to have length > 0, but it is empty. ' +
          'This indicates no data was extracted successfully.'
        );
      }
      
      console.log(`Found ${artifactArray.length} artifact(s):`, 
        artifactArray.map(artifact => ({ 
          item_type: artifact.item_type, 
          item_count: artifact.item_count 
        })));
      
      // Find the cards artifact
      const cardsArtifact = artifactArray.find(artifact => artifact.item_type === 'cards');
      
      if (!cardsArtifact) {
        throw new Error(
          `Expected to find an artifact with item_type 'cards', but none found. ` +
          `Available artifacts: ${JSON.stringify(artifactArray.map(a => ({ 
            item_type: a.item_type, 
            item_count: a.item_count 
          })), null, 2)}`
        );
      }
      
      // Validate cards artifact has item_count
      if (typeof cardsArtifact.item_count !== 'number') {
        throw new Error(
          `Expected cards artifact to have numeric item_count, but got ${typeof cardsArtifact.item_count}. ` +
          `Cards artifact: ${JSON.stringify(cardsArtifact, null, 2)}`
        );
      }
      
      // Validate cards artifact has exactly 12 items
      if (cardsArtifact.item_count !== 12) {
        throw new Error(
          `Expected cards artifact to have item_count = 12, but got ${cardsArtifact.item_count}. ` +
          `This indicates that not all cards data was extracted. ` +
          `Cards artifact details: ${JSON.stringify(cardsArtifact, null, 2)}`
        );
      }
      
      console.log('✅ Acceptance test passed: Successfully extracted 12 cards via EXTRACTION_DATA_CONTINUE');
      
      // All validations passed
      expect(callback.event_type).toBe('EXTRACTION_DATA_DONE');
      expect(artifactArray.length).toBeGreaterThan(0);
      expect(cardsArtifact.item_type).toBe('cards');
      expect(cardsArtifact.item_count).toBe(12);
    }, 60000); // 60 second test timeout
  });
});