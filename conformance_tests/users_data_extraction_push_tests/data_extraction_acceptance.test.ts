import fs from 'fs';
import path from 'path';
import { createCallbackServer, sendEventToSnapIn } from './utils';
import { Server } from 'http';

describe('Data Extraction Acceptance Test', () => {
  let callbackServer: Server;
  let receivedEvents: any[];

  beforeAll(async () => {
    // Set up the callback server to receive events from the snap-in
    const serverSetup = await createCallbackServer();
    callbackServer = serverSetup.server;
    receivedEvents = serverSetup.receivedEvents;
  });

  afterAll(() => {
    // Clean up the callback server
    if (callbackServer) {
      callbackServer.close();
    }
  });

  beforeEach(() => {
    // Clear received events before each test
    receivedEvents.length = 0;
  });

  test('should process EXTRACTION_DATA_START event and emit EXTRACTION_DATA_DONE', async () => {
    // Get Trello credentials from environment variables
    const trelloApiKey = process.env.TRELLO_API_KEY;
    const trelloToken = process.env.TRELLO_TOKEN;
    const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

    if (!trelloApiKey || !trelloToken || !trelloOrgId) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
    }

    // Load the test event data from the resource
    const testDataPath = path.resolve(__dirname, './test_data/data_extraction_test.json');
    if (!fs.existsSync(testDataPath)) {
      throw new Error(`Test data file not found at: ${testDataPath}`);
    }

    let testData = fs.readFileSync(testDataPath, 'utf8');
    
    // Replace placeholders with actual credentials
    testData = testData.replace(/<TRELLO_API_KEY>/g, trelloApiKey);
    testData = testData.replace(/<TRELLO_TOKEN>/g, trelloToken);
    testData = testData.replace(/<TRELLO_ORGANIZATION_ID>/g, trelloOrgId);
    
    // Parse the JSON data
    const testEvents = JSON.parse(testData);
    if (!testEvents || !Array.isArray(testEvents) || testEvents.length === 0) {
      throw new Error('Invalid test data format: expected non-empty array');
    }
    
    // Get the first event from the array
    const testEvent = testEvents[0];
    console.log('Sending test event to snap-in:', JSON.stringify(testEvent, null, 2));
    
    // Send the event to the snap-in
    await sendEventToSnapIn(testEvent);
    
    // Wait for callback events (give it some time to process)
    console.log('Waiting for callback events...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Log received events for debugging
    console.log(`Received ${receivedEvents.length} callback events`);
    receivedEvents.forEach((event, index) => {
      console.log(`Event ${index + 1}:`, JSON.stringify(event, null, 2));
    });
    
    // Verify exactly one event was received
    expect(receivedEvents.length).toBe(1);
    
    // Verify the event type is EXTRACTION_DATA_DONE
    expect(receivedEvents[0].event_type).toBe('EXTRACTION_DATA_DONE');
  }, 45000); // 45 second timeout
});