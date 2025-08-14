import axios from 'axios';
import { createServer, Server } from 'http';
import express from 'express';
import bodyParser from 'body-parser';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const SPECIFIC_BOARD_ID = '688725dad59c015ce052eecf';
const SPECIFIC_BEFORE_ID = '688725fdf26b3c50430cae23';
const EXPECTED_CARD_COUNT = 50;

// Define types for our event structure
interface EventPayload {
  connection_data: {
    org_id: string;
    org_name: string;
    key: string;
    key_type: string;
  };
  event_context: {
    external_sync_unit_id: string;
  };
  limit?: number;
  before?: string;
}

interface EventTemplate {
  context: {
    dev_oid: string;
    source_id: string;
    snap_in_id: string;
    snap_in_version_id: string;
    service_account_id: string;
    secrets: Record<string, string>;
  };
  execution_metadata: Record<string, string>;
  input_data: Record<string, Record<string, string>>;
  payload: EventPayload;
}

// Get environment variables
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID || '';

// Check for required environment variables
if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
  console.error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  process.exit(1);
}

// Create a basic event template
const createEventTemplate = (): EventTemplate => ({
  context: {
    dev_oid: 'dev_oid',
    source_id: 'source_id',
    snap_in_id: 'snap_in_id',
    snap_in_version_id: 'snap_in_version_id',
    service_account_id: 'service_account_id',
    secrets: {
      service_account_token: 'service_account_token',
    },
  },
  execution_metadata: {
    request_id: `req_${Date.now()}`,
    function_name: 'fetch_board_cards',
    event_type: 'test_event',
    devrev_endpoint: 'http://localhost:8003',
  },
  input_data: {
    global_values: {},
    event_sources: {},
  },
  payload: {
    connection_data: {
      org_id: TRELLO_ORGANIZATION_ID,
      org_name: 'Test Organization',
      key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
      key_type: 'api_key',
    },
    event_context: { 
      external_sync_unit_id: SPECIFIC_BOARD_ID,
    },
    limit: 100,
    before: SPECIFIC_BEFORE_ID,
  },
});

// Setup callback server
const setupCallbackServer = () => {
  const app = express();
  app.use(bodyParser.json());
  
  const server = createServer(app);
  server.listen(CALLBACK_SERVER_PORT, () => {
    console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
  });
  
  return { app, server };
};

describe('fetch_board_cards Acceptance Test', () => {
  let callbackServer: { app: express.Express; server: Server };
  
  beforeAll(() => {
    // Setup callback server
    callbackServer = setupCallbackServer();
    console.log('Setting up acceptance test for fetch_board_cards function');
    console.log(`Using board ID: ${SPECIFIC_BOARD_ID}`);
    console.log(`Using before ID: ${SPECIFIC_BEFORE_ID}`);
    console.log(`Expected card count: ${EXPECTED_CARD_COUNT}`);
  });
  
  afterAll(() => {
    // Close callback server
    if (callbackServer && callbackServer.server) {
      callbackServer.server.close();
      console.log('Closed callback server');
    }
  });
  
  // Acceptance Test: Fetch exactly 50 cards from the specified board with pagination
  test('should fetch exactly 50 cards from board with specific pagination parameters', async () => {
    console.log('Starting acceptance test for fetch_board_cards function');
    
    // Create event with specific parameters for acceptance test
    const event = createEventTemplate();
    console.log(`Request parameters: Board ID=${event.payload.event_context.external_sync_unit_id}, Limit=${event.payload.limit}, Before=${event.payload.before}`);
    
    try {
      console.log('Sending request to snap-in server...');
      const response = await axios.post(SNAP_IN_SERVER_URL, event);
      
      // Verify response status
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      
      const result = response.data.function_result;
      console.log(`Response received with status: ${result.status}`);
      console.log(`Response message: ${result.message}`);
      
      // Verify success status
      expect(result.status).toBe('success');
      if (result.status !== 'success') {
        console.error(`Expected status to be 'success' but got '${result.status}'. Error message: ${result.message}`);
      }
      
      // Verify cards array exists
      expect(result.cards).toBeDefined();
      expect(Array.isArray(result.cards)).toBe(true);
      
      // Verify exact card count
      const actualCardCount = result.cards.length;
      console.log(`Received ${actualCardCount} cards from the board`);
      expect(actualCardCount).toBe(EXPECTED_CARD_COUNT);
      
      // Log sample card data for debugging
      if (result.cards.length > 0) {
        console.log('Sample card data:', JSON.stringify(result.cards[0], null, 2));
        
        // Verify card structure
        const sampleCard = result.cards[0];
        expect(sampleCard.id).toBeDefined();
        expect(sampleCard.name).toBeDefined();
        expect(sampleCard.board_id).toBeDefined();
        expect(sampleCard.list_id).toBeDefined();
      }
      
      console.log('Acceptance test completed successfully');
    } catch (error: any) {
      console.error('Error in acceptance test:', error);
      
      // Provide detailed error information
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
      }
      
      fail(`Acceptance test failed: ${error.message}`);
    }
  });
});