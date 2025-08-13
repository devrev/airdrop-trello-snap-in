import fs from 'fs';
import path from 'path';
import { 
  sendEventToSnapIn, 
  createCallbackServer,
  TRELLO_API_KEY, 
  TRELLO_TOKEN, 
  TRELLO_ORGANIZATION_ID,
  CALLBACK_SERVER_URL
} from './utils/test-helpers';

// Check if required environment variables are set
beforeAll(() => {
  // Verify environment variables are set and not empty
  if (!TRELLO_API_KEY || TRELLO_API_KEY.trim() === '') {
    throw new Error('TRELLO_API_KEY environment variable is not set');
  }
  if (!TRELLO_TOKEN || TRELLO_TOKEN.trim() === '') {
    throw new Error('TRELLO_TOKEN environment variable is not set');
  }
  if (!TRELLO_ORGANIZATION_ID || TRELLO_ORGANIZATION_ID.trim() === '') {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is not set');
  }
});

describe('Extraction Acceptance Test', () => {
  test('extraction function processes data and emits EXTRACTION_DATA_DONE event', async () => {
    // Set up the callback server
    const { server, receivedData } = await createCallbackServer();
    
    try {
      // Load the test event data
      const testDataPath = path.join(__dirname, 'test-data', 'data_extraction_test.json');
      if (!fs.existsSync(testDataPath)) {
        throw new Error(`Test data file not found at: ${testDataPath}`);
      }
      
      const testDataRaw = fs.readFileSync(testDataPath, 'utf8');
      let testData = JSON.parse(testDataRaw);
      
      // Make sure we have at least one event
      if (!testData || !Array.isArray(testData) || testData.length === 0) {
        throw new Error('Invalid test data: Expected non-empty array');
      }
      
      // Get the first event
      const event = testData[0];
      
      // Replace placeholders with actual values
      if (event.payload?.connection_data?.key) {
        event.payload.connection_data.key = `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
      } else {
        throw new Error('Invalid test data: Missing connection_data.key in payload');
      }
      
      if (event.payload?.connection_data?.org_id) {
        event.payload.connection_data.org_id = TRELLO_ORGANIZATION_ID;
      } else {
        throw new Error('Invalid test data: Missing connection_data.org_id in payload');
      }
      
      // Update callback URL to point to our test server
      if (event.payload?.event_context?.callback_url) {
        event.payload.event_context.callback_url = CALLBACK_SERVER_URL + '/callback';
      } else {
        throw new Error('Invalid test data: Missing event_context.callback_url in payload');
      }
      
      // Send the event to the snap-in server
      const response = await sendEventToSnapIn(event);
      
      // Verify the response indicates success
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      
      // Wait for the callback to be received (up to 30 seconds)
      const maxWaitTime = 30000; // 30 seconds
      const startTime = Date.now();
      
      // Poll for the EXTRACTION_DATA_DONE event
      let foundDoneEvent = false;
      while (Date.now() - startTime < maxWaitTime && !foundDoneEvent) {
        // Check if we've received the EXTRACTION_DATA_DONE event
        for (const data of receivedData) {
          if (data.event_type === 'EXTRACTION_DATA_DONE') {
            foundDoneEvent = true;
            break;
          }
        }
        
        if (!foundDoneEvent) {
          // Wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Log received events for debugging
      console.log(`Received ${receivedData.length} events from DevRev`);
      receivedData.forEach((data, index) => {
        console.log(`Event ${index + 1}:`, JSON.stringify(data, null, 2));
      });
      
      // Verify we received exactly one EXTRACTION_DATA_DONE event
      const doneEvents = receivedData.filter(data => data.event_type === 'EXTRACTION_DATA_DONE');
      
      expect(doneEvents.length).toBe(1);
      expect(doneEvents[0].event_type).toBe('EXTRACTION_DATA_DONE');
      
    } finally {
      // Clean up the server
      if (server) {
        server.close();
      }
    }
  }, 60000); // 60 second timeout for this test
});