import * as fs from 'fs';
import * as path from 'path';
import { snapInClient } from './utils/http-client';
import { CallbackServer } from './utils/callback-server';

describe('Data Extraction Continue Acceptance Test', () => {
  const callbackServer = new CallbackServer();
  
  beforeAll(async () => {
    await callbackServer.start();
  });
  
  afterAll(async () => {
    await callbackServer.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  beforeEach(() => {
    callbackServer.clearEvents();
  });

  test('should successfully process EXTRACTION_DATA_CONTINUE event and emit EXTRACTION_DATA_DONE with correct artifacts', async () => {
    // Arrange
    console.log('Reading test data from JSON file...');
    const testDataPath = path.resolve(__dirname, './test-data/data_extraction_continue_test.json');
    
    if (!fs.existsSync(testDataPath)) {
      throw new Error(`Test data file not found at path: ${testDataPath}`);
    }
    
    const testDataRaw = fs.readFileSync(testDataPath, 'utf8');
    const testData = JSON.parse(testDataRaw);
    
    if (!testData || !Array.isArray(testData) || testData.length === 0) {
      throw new Error('Invalid test data format: expected non-empty array');
    }
    
    // Get credentials from environment variables
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const orgId = process.env.TRELLO_ORGANIZATION_ID;

    if (!apiKey) {
      throw new Error('Missing required environment variable: TRELLO_API_KEY');
    }
    if (!token) {
      throw new Error('Missing required environment variable: TRELLO_TOKEN');
    }
    if (!orgId) {
      throw new Error('Missing required environment variable: TRELLO_ORGANIZATION_ID');
    }

    // Replace placeholders in the test data
    console.log('Replacing placeholders in test data with actual credentials...');
    const event = testData[0]; // Get the first event from the array
    
    // Replace placeholders in connection_data
    if (event.payload && event.payload.connection_data) {
      const connectionData = event.payload.connection_data;
      connectionData.key = connectionData.key
        .replace('<TRELLO_API_KEY>', apiKey)
        .replace('<TRELLO_TOKEN>', token);
      connectionData.org_id = connectionData.org_id
        .replace('<TRELLO_ORGANIZATION_ID>', orgId);
    } else {
      throw new Error('Invalid test data: missing payload.connection_data');
    }
    
    // Update callback URL to point to our test server
    if (event.payload && event.payload.event_context) {
      event.payload.event_context.callback_url = 'http://localhost:8002/callback';
    } else {
      throw new Error('Invalid test data: missing payload.event_context');
    }
    
    // Act
    console.log('Sending event to Snap-In Server...');
    try {
      await snapInClient.post('/handle/sync', event);
    } catch (error: any) {
      console.error('Error sending event to Snap-In Server:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
    
    // Wait for callback to be received (with timeout)
    console.log('Waiting for callback response...');
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const events = callbackServer.getEvents();
      if (events.length > 0) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Assert
    const events = callbackServer.getEvents();
    console.log(`Received ${events.length} callback events`);
    
    // Check if we received any events
    expect(events.length).toBeGreaterThan(0);
    if (events.length === 0) {
      throw new Error('No callback events received within timeout period');
    }
    
    // Check if we received exactly one event
    expect(events.length).toBe(1);
    if (events.length > 1) {
      console.warn('Received multiple callback events:', JSON.stringify(events));
    }
    
    // Check if the event type is EXTRACTION_DATA_DONE
    const callbackEvent = events[0];
    expect(callbackEvent.event_type).toBe('EXTRACTION_DATA_DONE');
    
    // Additional validations for artifacts
    expect(callbackEvent.event_data).toBeDefined();
    expect(callbackEvent.event_data.artifacts).toBeDefined();
    
    // Log artifact details for debugging
    if (callbackEvent.event_data && callbackEvent.event_data.artifacts) {
      console.log(`Received ${callbackEvent.event_data.artifacts.length} artifacts`);
      
      callbackEvent.event_data.artifacts.forEach((artifact: any, index: number) => {
        console.log(`Artifact ${index + 1}: type=${artifact.item_type}, count=${artifact.item_count}`);
      });
    }
    
    // Verify that there's an artifact with item_type "cards" and item_count 150
    const cardsArtifact = callbackEvent.event_data.artifacts.find(
      (artifact: any) => artifact.item_type === 'cards'
    );
    
    expect(cardsArtifact).toBeDefined();
    if (!cardsArtifact) {
      throw new Error('No artifact with item_type "cards" found in the response');
    }
    
    expect(cardsArtifact.item_count).toBe(150);
  }, 60000); // 60 second timeout for this test
});