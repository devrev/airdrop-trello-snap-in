import axios from 'axios';
import { SnapInClient } from './utils/http-client';
import { CallbackServer } from './utils/test-server';
import { createBaseEvent } from './utils/event-factory';

// Setup constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const RATE_LIMIT_START_URL = 'http://localhost:8004/start_rate_limiting';
const RATE_LIMIT_END_URL = 'http://localhost:8004/end_rate_limiting';
const BOARD_ID = '688725dad59c015ce052eecf';
const TEST_NAME = 'fetch_board_cards_rate_limiting_test';

describe('fetch_board_cards rate limiting test', () => {
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
    
    // Ensure rate limiting is turned off after tests
    try {
      await axios.post(RATE_LIMIT_END_URL);
    } catch (error) {
      console.warn('Failed to end rate limiting after tests. This may affect other tests.');
    }
  });

  test('should handle rate limiting correctly', async () => {
    try {
      // Step 1: Start rate limiting
      console.log('Starting rate limiting...');
      const startResponse = await axios.post(RATE_LIMIT_START_URL, { test_name: TEST_NAME });
      expect(startResponse.status).toBe(200);
      console.log('Rate limiting started successfully');
      
      // Step 2: Create event with required parameters
      const event = createBaseEvent({
        payload: {
          event_context: {
            external_sync_unit_id: BOARD_ID
          }
        },
        input_data: {
          global_values: {
            limit: '100'
          }
        }
      });

      // Step 3: Send request to snap-in server
      console.log('Sending request to snap-in server...');
      const response = await snapInClient.sendRequest(event);
      
      // Step 4: Validate response structure
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      
      // Log the full response for debugging
      console.log('Response received:', JSON.stringify(response.function_result, null, 2));
      
      // Step 5: Validate status code is 429 (rate limited)
      expect(response.function_result.status_code).toBe(429);
      
      // Step 6: Validate api_delay is greater than 0 and less than or equal to 3
      expect(response.function_result.api_delay).toBeGreaterThan(0);
      
      // Check if api_delay is less than or equal to 3
      const apiDelay = response.function_result.api_delay;
      expect(apiDelay).toBeLessThanOrEqual(3);
      
      // Provide detailed error message if api_delay is too large
      if (apiDelay > 3) {
        console.error(`API delay (${apiDelay}) is greater than 3 seconds. This may indicate an issue with the api_delay calculation in the implementation code.`);
      }
      
      // Step 7: Validate error message contains rate limit information
      expect(response.function_result.message).toContain('Rate limit');
      
    } finally {
      // Step 8: End rate limiting regardless of test outcome
      console.log('Ending rate limiting...');
      try {
        const endResponse = await axios.post(RATE_LIMIT_END_URL);
        expect(endResponse.status).toBe(200);
        console.log('Rate limiting ended successfully');
      } catch (error) {
        console.error('Failed to end rate limiting:', error);
        throw new Error('Failed to end rate limiting. This may affect other tests.');
      }
    }
  });
});