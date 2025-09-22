import { SnapInClient } from './utils/http-client';
import { CallbackServer } from './utils/test-server';
import { createBaseEvent } from './utils/event-factory';

// Setup constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const BOARD_ID = '688725dad59c015ce052eecf';
const BEFORE_CARD_ID = '688725dce452b309c904aac4';
const TARGET_CARD_ID = '688725db990240b77167efef';
const TARGET_ATTACHMENT_NAME = 'devrev cover';

describe('fetch_board_cards attachment test', () => {
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

  test('should fetch card with specific attachment', async () => {
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
    
    // Find the card with id "688725db990240b77167efef"
    const card = response.function_result.cards.find((c: any) => c.id === TARGET_CARD_ID);
    
    // Detailed error message if card not found
    if (!card) {
      console.error('Card not found. Available cards:');
      response.function_result.cards.forEach((c: any, index: number) => {
        console.error(`${index + 1}. ${c.name} (ID: ${c.id})`);
      });
      fail(`Card with name "${TARGET_CARD_ID}" not found in the response`);
    }
    
    // Log card details for debugging
    console.log(`Found card: ${card.name} (ID: ${card.id})`);
    
    // Validate card has attachments
    expect(card.attachments).toBeDefined();
    expect(Array.isArray(card.attachments)).toBe(true);
    
    // Detailed error message if attachments array is empty
    if (card.attachments.length === 0) {
      fail(`Card "${TARGET_CARD_ID}" has no attachments`);
    }
    
    // Find the attachment with name "devrev cover"
    const attachment = card.attachments.find((a: any) => a.name === TARGET_ATTACHMENT_NAME);
    
    // Detailed error message if attachment not found
    if (!attachment) {
      console.error('Attachment not found. Available attachments:');
      card.attachments.forEach((a: any, index: number) => {
        console.error(`${index + 1}. ${a.name} (ID: ${a.id})`);
      });
      fail(`Attachment with name "${TARGET_ATTACHMENT_NAME}" not found in card "${TARGET_CARD_ID}"`);
    }
    
    // Log attachment details for debugging
    console.log(`Found attachment: ${attachment.name} (ID: ${attachment.id})`);
    
    // Verify attachment name
    expect(attachment.name).toBe(TARGET_ATTACHMENT_NAME);
  });
});