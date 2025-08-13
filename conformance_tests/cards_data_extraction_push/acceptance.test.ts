import fs from 'fs';
import path from 'path';
import { 
  validateEnvironment, 
  setupCallbackServer,
  waitForCallbackEvent,
  sendEventToSnapIn
} from './utils';
import { Server } from 'http';

// Constants
const DATA_EXTRACTION_TEST_FILE = path.resolve(__dirname, 'data_extraction_test.json');

// Test timeout - allow enough time for the extraction process
jest.setTimeout(60000);

describe('Trello Extraction Acceptance Test', () => {
  let callbackServer: Server;
  let receivedEvents: any[] = [];

  beforeAll(() => {
    // Validate environment variables
    validateEnvironment();
    
    // Setup callback server
    const { server, events } = setupCallbackServer();
    callbackServer = server;
    receivedEvents = events;
  });

  afterAll((done) => {
    // Close callback server
    if (callbackServer && callbackServer.listening) {
      callbackServer.close(() => {
        console.log('Callback server closed');
        done();
      });
    } else {
      done();
    }
  });

  test('should complete data extraction successfully', async () => {
    // Load test data
    let testData = loadTestData();
    
    // Send event to snap-in
    console.log('Sending extraction event to snap-in server...');
    const response = await sendEventToSnapIn(testData[0]);
    
    // Verify response from snap-in
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toContain('Extraction process initiated');
    
    // Wait for callback event
    console.log('Waiting for callback event...');
    const callbackEvent = await waitForCallbackEvent(receivedEvents, 'EXTRACTION_DATA_DONE', 50000);
    
    // Verify callback event
    expect(callbackEvent).toBeDefined();
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');
    
    // Verify we received exactly one event
    const doneEvents = receivedEvents.filter(event => event.event_type === 'EXTRACTION_DATA_DONE');
    expect(doneEvents.length).toBe(1);
  });
});

/**
 * Load test data from JSON file and replace placeholders with actual credentials
 */
function loadTestData(): any[] {
  try {
    // Read test data file
    const fileContent = fs.readFileSync(DATA_EXTRACTION_TEST_FILE, 'utf8');
    
    // Parse JSON
    const testData = JSON.parse(fileContent);
    
    // Get credentials from environment
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const orgId = process.env.TRELLO_ORGANIZATION_ID;
    
    if (!apiKey || !token || !orgId) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, or TRELLO_ORGANIZATION_ID');
    }
    
    // Replace placeholders in test data
    testData.forEach((event: any) => {
      if (event.payload && event.payload.connection_data) {
        event.payload.connection_data.key = event.payload.connection_data.key
          .replace('<TRELLO_API_KEY>', apiKey)
          .replace('<TRELLO_TOKEN>', token);
        
        event.payload.connection_data.org_id = event.payload.connection_data.org_id
          .replace('<TRELLO_ORGANIZATION_ID>', orgId);
      }
    });
    
    return testData;
  } catch (error) {
    console.error('Error loading test data:', error);
    throw new Error(`Failed to load test data: ${error instanceof Error ? error.message : String(error)}`);
  }
}