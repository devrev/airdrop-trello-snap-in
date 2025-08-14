import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CARD_ID = '688725fdf26b3c50430cae23'; // Test card ID as specified in requirements

// Environment variables
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

// Check required environment variables
if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
  console.error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  process.exit(1);
}

// Setup callback server
let callbackServer: Server;
const app = express();
app.use(bodyParser.json());

// Create a basic event object for testing
const createTestEvent = (cardId: string | null = CARD_ID) => {
  return {
    payload: {
      card_id: cardId,
      connection_data: {
        org_id: TRELLO_ORGANIZATION_ID,
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`
      }
    },
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token'
      }
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: 'fetch_card_attachments',
      event_type: 'test-event',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
};

// Setup and teardown
beforeAll(() => {
  // Start callback server
  callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
    console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
  });
});

afterAll(() => {
  // Close callback server
  if (callbackServer) {
    callbackServer.close();
  }
});

describe('fetch_card_attachments Function Tests', () => {
  // Test 1: Basic connectivity test
  test('should be able to connect to the Snap-In Server', async () => {
    try {
      const response = await axios.post(SNAP_IN_SERVER_URL, createTestEvent());
      expect(response.status).toBe(200);
    } catch (error) {
      console.error('Connection test failed:', error);
      throw error;
    }
  });

  // Test 2: Input validation test
  test('should return an error when card ID is missing', async () => {
    try {
      const response = await axios.post(SNAP_IN_SERVER_URL, createTestEvent(null));
      expect(response.data.function_result.status).toBe('error');
      expect(response.data.function_result.message).toContain('Card ID not found');
    } catch (error) {
      console.error('Input validation test failed:', error);
      throw error;
    }
  });

  // Test 3: Successful response test
  test('should return a success response with attachments for a valid card ID', async () => {
    try {
      const response = await axios.post(SNAP_IN_SERVER_URL, createTestEvent());
      expect(response.data.function_result.status).toBe('success');
      expect(response.data.function_result.message).toContain('Successfully fetched');
      expect(Array.isArray(response.data.function_result.attachments)).toBe(true);
    } catch (error) {
      console.error('Successful response test failed:', error);
      throw error;
    }
  });

  // Test 4: Response data structure test
  test('should return attachments with the expected properties', async () => {
    try {
      const response = await axios.post(SNAP_IN_SERVER_URL, createTestEvent());
      
      // Skip if no attachments were found (this is valid - the card might not have attachments)
      if (response.data.function_result.attachments.length === 0) {
        console.log('No attachments found for the test card. Skipping structure validation.');
        return;
      }
      
      // Check the first attachment's structure
      const attachment = response.data.function_result.attachments[0];
      expect(attachment).toHaveProperty('id');
      expect(attachment).toHaveProperty('name');
      expect(attachment).toHaveProperty('url');
      expect(attachment).toHaveProperty('mime_type');
      expect(attachment).toHaveProperty('date_created');
      expect(attachment).toHaveProperty('bytes');
      expect(attachment).toHaveProperty('is_upload');
      expect(attachment).toHaveProperty('member_id');
    } catch (error) {
      console.error('Response data structure test failed:', error);
      throw error;
    }
  });

  // Test 5: Error handling test with invalid credentials
  test('should handle API errors gracefully', async () => {
    try {
      // Create an event with invalid credentials
      const invalidEvent = createTestEvent();
      invalidEvent.payload.connection_data.key = 'key=invalid_key&token=invalid_token';
      
      const response = await axios.post(SNAP_IN_SERVER_URL, invalidEvent);
      expect(response.data.function_result.status).toBe('error');
      expect(response.data.function_result.message).toContain('Failed to fetch card attachments');
    } catch (error) {
      console.error('Error handling test failed:', error);
      throw error;
    }
  });
});