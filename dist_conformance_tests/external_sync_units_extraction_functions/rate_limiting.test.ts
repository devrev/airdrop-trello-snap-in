import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { 
  SNAP_IN_SERVER_URL, 
  TRELLO_API_KEY,
  TRELLO_TOKEN,
  TRELLO_ORGANIZATION_ID,
  setupCallbackServer,
  shutdownCallbackServer
} from './utils';
import { Server } from 'http';

// Global variables for test suite
let server: Server;
let receivedCallbacks: any[];
let clearCallbacks: () => void;

// Setup before all tests
beforeAll(async () => {  
  const setup = await setupCallbackServer();
  server = setup.server;
  receivedCallbacks = setup.receivedCallbacks;
  clearCallbacks = setup.clearCallbacks;
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
});

describe('Rate Limiting Tests', () => {
  // Clear callbacks before each test
  beforeEach(() => {
    clearCallbacks();
  });

  test('extraction function handles rate limiting correctly', async () => {
    // Step 1: Start rate limiting
    const testId = `rate-limit-test-${Date.now()}`;
    console.log(`Starting rate limiting test with ID: ${testId}`);
    
    try {
      const startRateLimitingResponse = await axios.post('http://localhost:8004/start_rate_limiting', {
        test_name: testId
      });
      
      expect(startRateLimitingResponse.status).toBe(200);
      console.log('Rate limiting started successfully');
    } catch (error) {
      console.error('Failed to start rate limiting:', error);
      throw new Error(`Failed to start rate limiting: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // Step 2: Invoke the extraction function
      // Read the JSON file
      const jsonFilePath = path.join(__dirname, 'trello_external_sync_unit_check.json');
      let jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
      
      // Replace placeholders with actual values
      jsonContent = jsonContent
        .replace('${TRELLO_API_KEY}', TRELLO_API_KEY || '')
        .replace('${TRELLO_TOKEN}', TRELLO_TOKEN || '')
        .replace('${TRELLO_ORGANIZATION_ID}', TRELLO_ORGANIZATION_ID || '');
      
      // Parse the JSON content
      const eventArray = JSON.parse(jsonContent);
      
      // We need to send only the first event (not wrapped in an array)
      const event = eventArray[0];
      
      // Send the event to the snap-in server
      const response = await axios.post(SNAP_IN_SERVER_URL, event);
      
      // Verify the function response
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      
      // Wait for callback to be received with exponential backoff
      let attempts = 0;
      const maxAttempts = 10;
      while (receivedCallbacks.length === 0 && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 500));
        attempts++;
      }
      
      // Detailed error message if no callbacks received
      if (receivedCallbacks.length === 0) {
        throw new Error(`No callbacks received after ${maxAttempts} attempts (${Math.pow(2, maxAttempts-1) * 500}ms total wait time)`);
      }
      
      // Verify exactly one callback was received
      expect(receivedCallbacks.length).toBe(1);
      
      // Add detailed error message if the assertion fails
      if (receivedCallbacks.length !== 1) {
        console.error(`Expected exactly one callback, but received ${receivedCallbacks.length}. Callbacks: ${JSON.stringify(receivedCallbacks)}`);
      }
      
      const callback = receivedCallbacks[0];
      
      // Verify the event type is EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR
      expect(callback.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR');
      
      // Verify error structure
      expect(callback.event_data).toBeDefined();
      expect(callback.event_data.error).toBeDefined();
      expect(callback.event_data.error.message).toBeDefined();
      
      console.log(`Received error message: ${callback.event_data.error.message}`);
    } catch (error) {
      console.error('Test execution failed:', error);
      throw error;
    } finally {
      // Step 3: End rate limiting (cleanup)
      try {
        const endRateLimitingResponse = await axios.post('http://localhost:8004/end_rate_limiting');
        expect(endRateLimitingResponse.status).toBe(200);
        console.log('Rate limiting ended successfully');
      } catch (error) {
        console.error('Failed to end rate limiting:', error);
        // Don't throw here to ensure we don't mask the original test error
      }
    }
  });
});

// Cleanup after all tests
afterAll(() => {
  shutdownCallbackServer();
});