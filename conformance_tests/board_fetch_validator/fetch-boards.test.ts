import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';

// Constants
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Environment variables
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

// Interfaces
interface FetchBoardsResponse {
  function_result: {
    success: boolean;
    message: string;
    boards?: Array<{
      id: string;
      name: string;
      description: string;
      url: string;
      short_url: string;
      is_closed: boolean;
      organization_id: string;
    }>;
    error?: any;
  };
  error?: any;
}

// Setup callback server
let callbackServer: Server;
let receivedCallbackData: any = null;

function setupCallbackServer(): Promise<void> {
  return new Promise((resolve) => {
    const app = express();
    app.use(bodyParser.json());
    
    app.post('/callback', (req, res) => {
      receivedCallbackData = req.body;
      res.status(200).send({ status: 'ok' });
    });
    
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server running at ${CALLBACK_SERVER_URL}`);
      resolve();
    });
  });
}

// Helper function to create event payload
function createEventPayload(functionName: string, connectionData: any = null, eventContext: any = null) {
  return {
    execution_metadata: {
      function_name: functionName,
      devrev_endpoint: 'http://localhost:8003'
    },
    context: {
      secrets: {
        service_account_token: 'test-token'
      },
      snap_in_id: 'test-snap-in-id'
    },
    payload: {
      connection_data: connectionData,
      event_context: eventContext
    }
  };
}

// Tests
describe('Trello Snap-In Fetch Boards Conformance Tests', () => {
  
  beforeAll(async () => {
    await setupCallbackServer();
  });
  
  afterAll(() => {
    if (callbackServer) {
      callbackServer.close();
    }
  });
  
  // Test 1: Basic Connectivity Test
  test('Test server is accessible', async () => {
    try {
      const response = await axios.post(TEST_SERVER_URL, createEventPayload('can_invoke'));
      expect(response.status).toBe(200);
      expect(response.data.function_result.success).toBe(true);
    } catch (error) {
      fail(`Failed to connect to test server: ${error}`);
    }
  });
  
  // Test 2: Environment Variables Test
  test('Required environment variables are present', () => {
    expect(TRELLO_API_KEY).toBeDefined();
    expect(TRELLO_TOKEN).toBeDefined();
    expect(TRELLO_ORGANIZATION_ID).toBeDefined();
  });
  
  // Test 3: Function Invocation Test
  test('fetch_boards function can be invoked', async () => {
    const connectionData = {
      key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`
    };
    
    const response = await axios.post(TEST_SERVER_URL, createEventPayload('fetch_boards', connectionData));
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('function_result');
  });
  
  // Test 4: Response Structure Test
  test('fetch_boards returns expected response structure', async () => {
    const connectionData = {
      key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`
    };
    
    const response = await axios.post<FetchBoardsResponse>(
      TEST_SERVER_URL, 
      createEventPayload('fetch_boards', connectionData)
    );
    
    expect(response.data.function_result).toHaveProperty('success');
    expect(response.data.function_result).toHaveProperty('message');
    
    if (response.data.function_result.success) {
      expect(response.data.function_result).toHaveProperty('boards');
      expect(Array.isArray(response.data.function_result.boards)).toBe(true);
    } else {
      expect(response.data.function_result).toHaveProperty('error');
    }
  });
  
  // Test 5: Data Validation Test
  test('fetched boards contain expected fields', async () => {
    const connectionData = {
      key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`
    };
    
    const response = await axios.post<FetchBoardsResponse>(
      TEST_SERVER_URL, 
      createEventPayload('fetch_boards', connectionData)
    );
    
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.boards).toBeDefined();
    expect(response.data.function_result.boards!.length).toBeGreaterThan(0);
    
    const firstBoard = response.data.function_result.boards![0];
    expect(firstBoard).toHaveProperty('id');
    expect(firstBoard).toHaveProperty('name');
    expect(firstBoard).toHaveProperty('description');
    expect(firstBoard).toHaveProperty('url');
    expect(firstBoard).toHaveProperty('short_url');
    expect(firstBoard).toHaveProperty('is_closed');
    expect(firstBoard).toHaveProperty('organization_id');
  });
  
  // Test 6: Error Handling Test
  test('fetch_boards handles invalid credentials correctly', async () => {
    const connectionData = {
      key: 'key=invalid_key&token=invalid_token'
    };
    
    const response = await axios.post<FetchBoardsResponse>(
      TEST_SERVER_URL, 
      createEventPayload('fetch_boards', connectionData)
    );
    
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('Failed to fetch boards');
  });
  
  // Test 7: Callback Server Test
  test('can push data to callback server', async () => {
    const connectionData = {
      key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`
    };
    
    const eventContext = {
      callback_url: `${CALLBACK_SERVER_URL}/callback`
    };
    
    const response = await axios.post(
      TEST_SERVER_URL, 
      createEventPayload('can_push_data', connectionData, eventContext)
    );
    
    expect(response.data.function_result.can_push).toBe(true);
    
    // Wait a bit for the callback to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if we received data on our callback server
    expect(receivedCallbackData).not.toBeNull();
    expect(receivedCallbackData).toHaveProperty('test_data');
    expect(receivedCallbackData.test_data).toBe('This is a test payload');
  });

  // Test 8: Acceptance Test - Check for "SaaS connectors" board
  test('fetch_boards returns a board named "SaaS connectors"', async () => {
    // Skip test if environment variables are not set
    if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
      console.warn('Skipping test: Trello credentials not provided');
      return;
    }

    const connectionData = {
      key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`
    };
    
    try {
      const response = await axios.post<FetchBoardsResponse>(
        TEST_SERVER_URL, 
        createEventPayload('fetch_boards', connectionData)
      );
      
      // Check if the function call was successful with detailed error reporting
      if (!response.data.function_result.success) {
        const errorDetails = JSON.stringify(response.data.function_result.error || {});
        console.error(`Expected fetch_boards to succeed but got error: ${errorDetails}`);
        fail(`fetch_boards function failed: ${response.data.function_result.message}`);
      }
      expect(response.data.function_result.success).toBe(true);
      
      // Check if boards were returned
      expect(response.data.function_result.boards).toBeDefined();
      expect(Array.isArray(response.data.function_result.boards)).toBe(true);
      
      const boards = response.data.function_result.boards!;
      
      // Check if any boards were returned
      if (boards.length === 0) {
        fail('No boards were returned from the API');
      }
      expect(boards.length).toBeGreaterThan(0);
      
      // Check if "SaaS connectors" board exists
      const boardNames = boards.map(board => board.name);
      const saasConnectorsBoard = boards.find(board => 
        board.name === 'SaaS connectors'
      );
      
      // Provide detailed error message if the board is not found
      if (!saasConnectorsBoard) {
        console.error(`Available boards: ${boardNames.join(', ')}`);
        fail(`Board "SaaS connectors" not found among ${boards.length} boards`);
      }
      expect(saasConnectorsBoard).toBeDefined();
      
      // Additional validation on the SaaS connectors board
      if (saasConnectorsBoard) {
        expect(saasConnectorsBoard.id).toBeTruthy();
        expect(saasConnectorsBoard.url).toBeTruthy();
        console.log(`Found "SaaS connectors" board with ID: ${saasConnectorsBoard.id}`);
      }
    } catch (error: any) {
      // Detailed error handling for debugging
      if (error.response) {
        fail(`API request failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        fail(`API request failed, no response received: ${error.request}`);
      } else {
        fail(`Error setting up test: ${error.message}`);
      }
    }
  });
});