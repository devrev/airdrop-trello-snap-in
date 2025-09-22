import { SnapInClient } from './utils/http-client';
import { CallbackServer } from './utils/test-server';
import { createBaseEvent } from './utils/event-factory';

// Setup constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const BOARD_ID = '688725dad59c015ce052eecf';
const BEFORE_CARD_ID = '688725fdf26b3c50430cae23';
const EXPECTED_CARD_COUNT = 50;

describe('fetch_board_cards acceptance test with before parameter', () => {
  let callbackServer: CallbackServer;
  let snapInClient: SnapInClient;

  beforeAll(async () => {
    // Check required environment variables
    if (!process.env.TRELLO_API_KEY || !process.env.TRELLO_TOKEN || !process.env.TRELLO_ORGANIZATION_ID) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
    }

    // Setup callback server
    callbackServer = new CallbackServer({ port: CALLBACK_SERVER_PORT });
    await callbackServer.start();

    // Setup snap-in client
    snapInClient = new SnapInClient({ endpoint: SNAP_IN_SERVER_URL });
  });

  afterAll(async () => {
    // Cleanup callback server
    await callbackServer.stop();
    
    // Close HTTP client connections
    snapInClient.close();
  });

  test('should fetch exactly 50 cards when using before parameter', async () => {
    // Create event with required parameters
    const event = createBaseEvent({
      payload: {
        event_context: {
          external_sync_unit_id: BOARD_ID
        }
      },
      input_data: {
        global_values: {
          limit: '100',
          before: BEFORE_CARD_ID
        }
      }
    });

    // Send request to snap-in server
    const response = await snapInClient.sendRequest(event);

    // Validate response structure
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.status_code).toBe(200);
    expect(response.function_result.api_delay).toBeDefined();
    expect(response.function_result.message).toContain('Successfully fetched');
    
    // Validate cards array
    expect(response.function_result.cards).toBeDefined();
    expect(Array.isArray(response.function_result.cards)).toBe(true);
    
    // Validate card count with detailed error message
    const actualCardCount = response.function_result.cards.length;
    expect(actualCardCount).toBe(EXPECTED_CARD_COUNT);
    
    // Additional check with custom message if the assertion above fails
    if (actualCardCount !== EXPECTED_CARD_COUNT) {
      console.error(`Expected exactly ${EXPECTED_CARD_COUNT} cards to be returned, but got ${actualCardCount}`);
      console.error(`This may indicate an issue with the 'before' parameter handling or the test data has changed.`);
      fail(`Expected exactly ${EXPECTED_CARD_COUNT} cards to be returned, but got ${actualCardCount}`);
    }
    
    // Validate card structure (sample validation)
    if (response.function_result.cards.length > 0) {
      const firstCard = response.function_result.cards[0];
      expect(firstCard).toHaveProperty('id');
      expect(firstCard).toHaveProperty('name');
      expect(firstCard).toHaveProperty('idBoard');
      expect(firstCard).toHaveProperty('attachments');
      expect(Array.isArray(firstCard.attachments)).toBe(true);
      
      // Log first card ID for debugging purposes
      console.log(`First card ID: ${firstCard.id}`);
      
      // Verify the 'before' parameter is working correctly
      if (firstCard.id === BEFORE_CARD_ID) {
        fail(`First card ID (${firstCard.id}) should not match the 'before' parameter (${BEFORE_CARD_ID})`);
      }
    }
    
    // Validate last card to ensure pagination is working correctly
    if (response.function_result.cards.length > 0) {
      const lastCard = response.function_result.cards[response.function_result.cards.length - 1];
      console.log(`Last card ID: ${lastCard.id}`);
    }
  });
});