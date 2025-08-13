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
const DATA_EXTRACTION_CONTINUE_TEST_FILE = path.resolve(__dirname, 'data_extraction_continue_test.json');

// Test timeout - allow enough time for the extraction process
jest.setTimeout(120000); // 120 seconds as per requirements

describe('Trello Data Extraction Continue Acceptance Test', () => {
  let callbackServer: Server;
  let receivedEvents: any[] = [];

  beforeAll(() => {
    // Validate environment variables
    validateEnvironment();
    
    // Setup callback server
    const { server, events } = setupCallbackServer();
    callbackServer = server;
    receivedEvents = events;
    
    console.log('Callback server set up and listening for events');
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

  test('should complete data extraction continuation successfully', async () => {
    // Load test data
    console.log('Loading test data from file...');
    const testData = loadTestData();
    
    // Send event to snap-in
    console.log('Sending extraction continue event to snap-in server...');
    const response = await sendEventToSnapIn(testData);
    
    // Verify response from snap-in
    console.log('Verifying response from snap-in server...');
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toContain('Extraction process initiated');
    
    // Wait for callback event
    console.log('Waiting for EXTRACTION_DATA_DONE callback event...');
    const callbackEvent = await waitForCallbackEvent(receivedEvents, 'EXTRACTION_DATA_DONE', 90000);
    
    // Verify callback event
    console.log('Verifying callback event...');
    expect(callbackEvent).toBeDefined();
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');
    
    // Verify we received exactly one EXTRACTION_DATA_DONE event
    const doneEvents = receivedEvents.filter(event => event.event_type === 'EXTRACTION_DATA_DONE');
    if (doneEvents.length !== 1) {
      console.error(`Expected exactly 1 EXTRACTION_DATA_DONE event, but received ${doneEvents.length}`);
      console.error('All received events:', JSON.stringify(receivedEvents, null, 2));
    }
    expect(doneEvents.length).toBe(1);
    
    // Verify the event_data contains artifacts with the expected properties
    console.log('Verifying event_data artifacts...');
    expect(callbackEvent.event_data).toBeDefined();
    expect(callbackEvent.event_data.artifacts).toBeDefined();
    
    // Find the cards artifact
    const cardsArtifact = callbackEvent.event_data.artifacts.find(
      (artifact: any) => artifact.item_type === 'cards'
    );
    
    if (!cardsArtifact) {
      console.error('No artifact with item_type "cards" found in event_data.artifacts');
      console.error('All artifacts:', JSON.stringify(callbackEvent.event_data.artifacts, null, 2));
    }
    
    expect(cardsArtifact).toBeDefined();
    expect(cardsArtifact.item_count).toBe(150);
    
    console.log('Test completed successfully');
  });
});

/**
 * Load test data from JSON file and replace placeholders with actual credentials
 */
function loadTestData(): any {
  try {
    // Read test data file
    const fileContent = fs.readFileSync(DATA_EXTRACTION_CONTINUE_TEST_FILE, 'utf8');
    
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
    if (testData.payload && testData.payload.connection_data) {
      testData.payload.connection_data.key = testData.payload.connection_data.key
        .replace('<TRELLO_API_KEY>', apiKey)
        .replace('<TRELLO_TOKEN>', token);
      
      testData.payload.connection_data.org_id = testData.payload.connection_data.org_id
        .replace('<TRELLO_ORGANIZATION_ID>', orgId);
    }
    
    return testData;
  } catch (error) {
    console.error('Error loading test data:', error);
    throw new Error(`Failed to load test data: ${error instanceof Error ? error.message : String(error)}`);
  }
}