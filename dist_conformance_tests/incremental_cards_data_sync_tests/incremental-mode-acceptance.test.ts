import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  TRELLO_API_KEY,
  TRELLO_TOKEN, 
  startCallbackServer,
  stopCallbackServer,
  SNAP_IN_SERVER_URL,
  CALLBACK_SERVER_URL,
  TRELLO_ORGANIZATION_ID
} from './utils';

// Test data
const TEST_CARD_ID = '688725fd3e26ebcf364bff4a';
const DATA_EXTRACTION_TEST_FILE = path.resolve(__dirname, './data_extraction_test.json');

// Global variables for test state
let lastSuccessfulSyncTimestamp: string;
let testData: any;
let callbackData: any[] = [];

// Mock callback server handler to capture callbacks
const captureCallback = (req: any, res: any) => {
  console.log('Received callback:', JSON.stringify(req.body, null, 2));
  callbackData.push(req.body);
  res.status(200).send({ status: 'success' });
};

// Helper function to load and prepare test data
function loadTestData() {
  try {
    // Read the test data file
    const rawData = fs.readFileSync(DATA_EXTRACTION_TEST_FILE, 'utf8');
    
    // Replace placeholders with actual values
    let processedData = rawData
      .replace(/<TRELLO_API_KEY>/g, TRELLO_API_KEY)
      .replace(/<TRELLO_TOKEN>/g, TRELLO_TOKEN)
      .replace(/<TRELLO_ORGANIZATION_ID>/g, TRELLO_ORGANIZATION_ID);
    
    // Parse the JSON data
    testData = JSON.parse(processedData);
    
    // Ensure the callback URL is set correctly
    testData[0].payload.event_context.callback_url = `${CALLBACK_SERVER_URL}/callback`;
    
    return testData;
  } catch (error) {
    console.error('Error loading test data:', error);
    throw new Error(`Failed to load test data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to update a card name via Trello API
async function updateCardName(cardId: string, newName: string) {
  try {
    const url = `https://api.trello.com/1/cards/${cardId}?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&name=${encodeURIComponent(newName)}`;
    const response = await axios.put(url, {}, {
      headers: { 'Accept': 'application/json' }
    });
    
    console.log(`Card ${cardId} updated with name: ${newName}`);
    return response.data;
  } catch (error) {
    console.error('Error updating card:', error);
    throw new Error(`Failed to update card: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to send extraction event to snap-in
async function sendExtractionEvent(eventData: any) {
  try {
    // Reset callback data before sending event
    callbackData = [];
    
    // Send the event to the snap-in
    const response = await axios.post(SNAP_IN_SERVER_URL, eventData[0]);
    console.log('Event payload:', JSON.stringify(eventData[0].payload, null, 2));
    console.log('Extraction event sent, response status:', response.status);
    
    return response.data;
  } catch (error) {
    console.error('Error sending extraction event:', error);
    throw new Error(`Failed to send extraction event: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function to wait for callback with timeout
async function waitForCallback(timeoutMs = 30000, checkIntervalMs = 1000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (callbackData.length > 0) {
      return callbackData;
    }
    await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
  }
  
  throw new Error(`Timed out waiting for callback after ${timeoutMs}ms`);
}

describe('Incremental Mode Acceptance Test', () => {
  // Set up before all tests
  beforeAll(async () => {
    // Check required environment variables
    if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
      const missingVars = [];
      if (!TRELLO_API_KEY) missingVars.push('TRELLO_API_KEY');
      if (!TRELLO_TOKEN) missingVars.push('TRELLO_TOKEN');
      if (!TRELLO_ORGANIZATION_ID) missingVars.push('TRELLO_ORGANIZATION_ID');
      
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    
    // Start callback server with custom handler
    await startCallbackServer(captureCallback);
    
    // Load test data
    loadTestData();
    
    // Set initial timestamp (5 minutes ago)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    lastSuccessfulSyncTimestamp = fiveMinutesAgo.toISOString();
  }, 30000);
  
  // Clean up after all tests
  afterAll(async () => {
    await stopCallbackServer();
  });
  
  test('should validate incremental mode extraction flow', async () => {
    // Step 1: Initial extraction in normal mode
    console.log('Step 1: Running initial extraction in normal mode');
    const initialResponse = await sendExtractionEvent(testData);
    
    // Verify response
    expect(initialResponse).toBeDefined();
    expect(initialResponse.error).toBeUndefined();
    expect(initialResponse.function_result).toBeDefined();
    expect(initialResponse.function_result.status).toBe('success');
    
    // Wait for callback
    console.log('Waiting for callback from initial extraction...');
    const initialCallbacks = await waitForCallback();
    
    // Verify callback
    expect(initialCallbacks.length).toBe(1);
    expect(initialCallbacks[0].event_type).toBe('EXTRACTION_DATA_DONE');
    
    // Store the current time as lastSuccessfulSyncTimestamp
    lastSuccessfulSyncTimestamp = new Date().toISOString();
    console.log('Initial extraction completed successfully');
    
    // Step 2: Update card name with unique identifier
    const uuid = uuidv4().substring(0, 8);
    const newCardName = `Card50-${uuid}`;
    console.log(`Step 2: Updating card ${TEST_CARD_ID} with name "${newCardName}"`);
    await updateCardName(TEST_CARD_ID, newCardName);
    
    // Wait a moment to ensure the update is processed and timestamp is different
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Run extraction in incremental mode
    console.log('Step 3: Running extraction in incremental mode');
    // Create a copy of the test data and modify it for incremental mode
    const incrementalTestData = JSON.parse(JSON.stringify(testData));
    incrementalTestData[0].payload.event_context.mode = 'INCREMENTAL';
    
    // Add lastSuccessfulSyncStarted to the event data
    incrementalTestData[0].payload.event_data = {
      ...incrementalTestData[0].payload.event_data,
      lastSuccessfulSyncStarted: lastSuccessfulSyncTimestamp
    };
    
    const incrementalResponse = await sendExtractionEvent(incrementalTestData);
    
    // Verify response
    expect(incrementalResponse).toBeDefined();
    expect(incrementalResponse.error).toBeUndefined();
    expect(incrementalResponse.function_result).toBeDefined();
    expect(incrementalResponse.function_result.status).toBe('success');
    
    // Wait for callback
    console.log('Waiting for callback from incremental extraction...');
    const incrementalCallbacks = await waitForCallback();
    
    // Verify callback
    expect(incrementalCallbacks.length).toBe(1);
    expect(incrementalCallbacks[0].event_type).toBe('EXTRACTION_DATA_DONE');
    
    // Verify artifacts data
    expect(incrementalCallbacks[0].event_data).toBeDefined();
    expect(incrementalCallbacks[0].event_data.artifacts).toBeDefined();
    
    // Find the cards artifact
    const cardsArtifact = incrementalCallbacks[0].event_data.artifacts.find(
      (artifact: any) => artifact.item_type === 'cards'
    );
    console.log('Cards artifact:', JSON.stringify(cardsArtifact, null, 2));
    expect(cardsArtifact).toBeDefined();
    expect(cardsArtifact.item_count).toBe(1);
    
    console.log('Incremental extraction validated successfully');
  }, 120000); // 2 minute timeout
});