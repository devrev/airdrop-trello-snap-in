import axios from 'axios';
import { Server } from 'http';
import { getTestEnvironment, createCallbackServer, createBaseEvent, TestEnvironment } from './test-utils';

describe('fetch_board_cards specific acceptance test', () => {
  let callbackServer: Server;
  let env: TestEnvironment;
  const snapInServerUrl = 'http://localhost:8000/handle/sync';

  beforeAll(async () => {
    env = getTestEnvironment();
    const { server } = await createCallbackServer();
    callbackServer = server;
  });

  afterAll(async () => {
    if (callbackServer) {
      await new Promise<void>((resolve) => {
        callbackServer.close(() => {
          resolve();
        });
      });
    }
  });

  describe('Specific Card and Attachment Validation', () => {
    test('should fetch board cards and validate specific card attachment with name "devrev cover"', async () => {
      console.log('=== ACCEPTANCE TEST: Specific Card and Attachment Validation ===');
      
      // Step 1: Test The Function "fetch_board_cards" with specific parameters
      console.log('Step 1: Calling fetch_board_cards with specific parameters');
      const event = createBaseEvent(env, { limit: '100', before: '688725dce452b309c904aac4' });
      
      // Set the specific board ID as required by the acceptance test
      event.payload.event_context.external_sync_unit_id = '688725dad59c015ce052eecf';
      event.payload.event_context.external_sync_unit = '688725dad59c015ce052eecf';
      
      console.log(`  Board ID: ${event.payload.event_context.external_sync_unit_id}`);
      console.log(`  Limit: ${event.input_data.global_values.limit}`);
      console.log(`  Before: ${event.input_data.global_values.before}`);

      const response = await axios.post(snapInServerUrl, event);

      // Verify the API response structure
      expect(response.status).toBe(200);
      expect(response.data.function_result).toBeDefined();
      
      const functionResult = response.data.function_result;
      
      console.log(`  API Status Code: ${functionResult.status_code}`);
      console.log(`  API Message: ${functionResult.message}`);
      console.log(`  API Delay: ${functionResult.api_delay}`);
      
      // Verify successful API call
      if (functionResult.status_code !== 200) {
        console.error(`STEP 1 FAILED: API call unsuccessful`);
        console.error(`  Expected status code: 200`);
        console.error(`  Actual status code: ${functionResult.status_code}`);
        console.error(`  API message: ${functionResult.message}`);
        throw new Error(`Step 1 failed: API returned status code ${functionResult.status_code} instead of 200`);
      }
      
      expect(functionResult.status_code).toBe(200);
      expect(functionResult.cards).toBeDefined();
      expect(Array.isArray(functionResult.cards)).toBe(true);
      
      const apiResult = functionResult.cards;
      console.log(`  Successfully retrieved ${apiResult.length} cards from API`);
      console.log('Step 1: COMPLETED - API call successful');

      // Step 2: Retrieve the card with specific ID
      console.log('Step 2: Looking for card with ID "688725db990240b77167efef"');
      const targetCardId = '688725db990240b77167efef';
      const card = apiResult.find((c: any) => c.id === targetCardId);
      
      if (!card) {
        console.error(`STEP 2 FAILED: Card with ID "${targetCardId}" not found`);
        console.error(`  Total cards retrieved: ${apiResult.length}`);
        console.error(`  Available card IDs (first 10):`);
        apiResult.slice(0, 10).forEach((c: any, index: number) => {
          console.error(`    ${index + 1}. ${c.id} (name: "${c.name || 'N/A'}")`);
        });
        if (apiResult.length > 10) {
          console.error(`    ... and ${apiResult.length - 10} more cards`);
        }
        throw new Error(`Step 2 failed: Card with ID "${targetCardId}" was not found in the API results`);
      }
      
      console.log(`  Found target card: ID="${card.id}", Name="${card.name || 'N/A'}"`);
      console.log('Step 2: COMPLETED - Target card found');

      // Step 3: Retrieve the attachment with specific name
      console.log('Step 3: Looking for attachment with name "devrev cover"');
      
      if (!card.attachments) {
        console.error(`STEP 3 FAILED: Card "${targetCardId}" has no attachments property`);
        console.error(`  Card properties: ${Object.keys(card).join(', ')}`);
        throw new Error(`Step 3 failed: Card "${targetCardId}" does not have an attachments property`);
      }
      
      if (!Array.isArray(card.attachments)) {
        console.error(`STEP 3 FAILED: Card "${targetCardId}" attachments is not an array`);
        console.error(`  Attachments type: ${typeof card.attachments}`);
        console.error(`  Attachments value: ${JSON.stringify(card.attachments)}`);
        throw new Error(`Step 3 failed: Card "${targetCardId}" attachments property is not an array`);
      }
      
      console.log(`  Card has ${card.attachments.length} attachment(s)`);
      
      if (card.attachments.length === 0) {
        console.error(`STEP 3 FAILED: Card "${targetCardId}" has no attachments`);
        throw new Error(`Step 3 failed: Card "${targetCardId}" has an empty attachments array`);
      }
      
      // Log all available attachments for debugging
      console.log(`  Available attachments:`);
      card.attachments.forEach((att: any, index: number) => {
        console.log(`    ${index + 1}. Name: "${att.name || 'N/A'}", ID: "${att.id || 'N/A'}"`);
      });
      
      const targetAttachmentName = 'devrev cover';
      const attachment = card.attachments.find((att: any) => att.name === targetAttachmentName);
      
      if (!attachment) {
        console.error(`STEP 3 FAILED: Attachment with name "${targetAttachmentName}" not found`);
        console.error(`  Card ID: ${targetCardId}`);
        console.error(`  Total attachments: ${card.attachments.length}`);
        console.error(`  Available attachment names:`);
        card.attachments.forEach((att: any, index: number) => {
          console.error(`    ${index + 1}. "${att.name || 'N/A'}"`);
        });
        throw new Error(`Step 3 failed: Attachment with name "${targetAttachmentName}" was not found in card "${targetCardId}"`);
      }
      
      console.log(`  Found target attachment: Name="${attachment.name}", ID="${attachment.id || 'N/A'}"`);
      console.log('Step 3: COMPLETED - Target attachment found');

      // Step 4: Expect attachment name to be equal to "devrev cover"
      console.log('Step 4: Validating attachment name');
      console.log(`  Expected name: "devrev cover"`);
      console.log(`  Actual name: "${attachment.name}"`);
      
      if (attachment.name !== targetAttachmentName) {
        console.error(`STEP 4 FAILED: Attachment name mismatch`);
        console.error(`  Expected: "devrev cover"`);
        console.error(`  Actual: "${attachment.name}"`);
        console.error(`  Attachment ID: ${attachment.id || 'N/A'}`);
        console.error(`  Card ID: ${targetCardId}`);
        throw new Error(`Step 4 failed: Expected attachment name to be "devrev cover" but got "${attachment.name}"`);
      }
      
      expect(attachment.name).toBe('devrev cover');
      console.log('Step 4: COMPLETED - Attachment name validation successful');
      
      console.log('=== ACCEPTANCE TEST PASSED: All steps completed successfully ===');
      console.log('Summary:');
      console.log(`  ✓ Step 1: Retrieved ${apiResult.length} cards from board ${event.payload.event_context.external_sync_unit_id}`);
      console.log(`  ✓ Step 2: Found card with ID "${targetCardId}"`);
      console.log(`  ✓ Step 3: Found attachment with name "${targetAttachmentName}" in the card`);
      console.log(`  ✓ Step 4: Validated attachment name equals "devrev cover"`);
      
    }, 60000); // Extended timeout for this comprehensive test
  });
});