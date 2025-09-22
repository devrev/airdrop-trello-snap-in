import { SnapInClient } from './utils/http-client';
import { CallbackServer } from './utils/test-server';
import { createBaseEvent } from './utils/event-factory';

// Setup constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;

describe('fetch_board_cards function', () => {
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

  // Test 1: Basic functionality - fetch cards with valid parameters
  test('should fetch cards with valid board ID and limit', async () => {
    // Create event with required parameters
    const event = createBaseEvent({
      input_data: {
        global_values: {
          limit: '10'
        }
      }
    });

    // Send request to snap-in server
    const response = await snapInClient.sendRequest(event);

    // Validate response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.status_code).toBe(200);
    expect(response.function_result.api_delay).toBeDefined();
    expect(response.function_result.message).toContain('Successfully fetched');
    expect(response.function_result.cards).toBeDefined();
    expect(Array.isArray(response.function_result.cards)).toBe(true);
  });

  // Test 2: Pagination - fetch cards with "before" parameter
  test('should fetch cards with pagination using "before" parameter', async () => {
    // Create event with pagination parameters
    const event = createBaseEvent({
      input_data: {
        global_values: {
          limit: '5',
          before: '2025-09-19T00:00:00.000Z' // Using today's date as a reference point
        }
      }
    });

    // Send request to snap-in server
    const response = await snapInClient.sendRequest(event);

    // Validate response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.status_code).toBe(200);
    expect(response.function_result.cards).toBeDefined();
    expect(Array.isArray(response.function_result.cards)).toBe(true);
  });

  // Test 3: Error handling - missing required parameters
  test('should return error when limit parameter is missing', async () => {
    // Create event with missing limit parameter
    const event = createBaseEvent();
    // Remove the limit parameter
    delete event.input_data.global_values.limit;

    // Send request to snap-in server
    const response = await snapInClient.sendRequest(event);

    // Validate error response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(false);
    expect(response.function_result.message).toContain('Missing or invalid limit parameter');
  });

  // Test 4: Error handling - missing board ID
  test('should return error when board ID is missing', async () => {
    // Create event with missing board ID
    const event = createBaseEvent();
    // Remove the external_sync_unit_id
    delete event.payload.event_context.external_sync_unit_id;

    // Send request to snap-in server
    const response = await snapInClient.sendRequest(event);

    // Validate error response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(false);
    expect(response.function_result.message).toContain('Missing board ID');
  });

  // Test 5: Verify attachments parameter is used
  test('should fetch cards with attachments included', async () => {
    // Create event with required parameters
    const event = createBaseEvent({
      input_data: {
        global_values: {
          limit: '10'
        }
      }
    });

    // Send request to snap-in server
    const response = await snapInClient.sendRequest(event);

    // Validate response includes attachments
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    
    // Check if at least one card has attachments property
    if (response.function_result.cards && response.function_result.cards.length > 0) {
      const hasAttachmentsProperty = response.function_result.cards.some(
        (card: any) => 'attachments' in card
      );
      expect(hasAttachmentsProperty).toBe(true);
    }
  });
});