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

describe('External Sync Unit Check Tests', () => {
  // Clear callbacks before each test
  beforeEach(() => {
    clearCallbacks();
  });

  test('extraction function correctly processes external sync units check', async () => {
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
    
    // Add additional context if the assertion fails
    if (receivedCallbacks.length !== 1) {
      console.error(`Expected exactly one callback, but received ${receivedCallbacks.length}. Callbacks: ${JSON.stringify(receivedCallbacks)}`);
    }
    
    const callback = receivedCallbacks[0];
    
    // Verify the event type
    expect(callback.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    
    // Add additional context if the assertion fails
    if (callback.event_type !== 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE') {
      console.error(`Expected event_type to be 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE', but got '${callback.event_type}'. Full callback: ${JSON.stringify(callback)}`);
    }
    
    // Verify external sync units structure
    expect(callback.event_data).toBeDefined();
    expect(callback.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(callback.event_data.external_sync_units)).toBe(true);
    
    // Verify at least one external sync unit was returned
    expect(callback.event_data.external_sync_units.length).toBeGreaterThan(0);
    
    // Check each external sync unit has the required fields
    for (const unit of callback.event_data.external_sync_units) {
      expect(unit.id).toBeDefined();
      expect(unit.name).toBeDefined();
      expect(unit.description).toBeDefined();
      expect(unit.item_type).toBe('cards');
    }
  });
});

// Cleanup after all tests
afterAll(() => {
  shutdownCallbackServer();
});