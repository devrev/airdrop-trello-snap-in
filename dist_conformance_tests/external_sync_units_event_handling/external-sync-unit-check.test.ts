import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { ExtractorEventType } from '@devrev/ts-adaas';

// Test configuration
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const RESOURCE_FILE_PATH = path.join(__dirname, 'external_sync_unit_check.json');

// Setup callback server to receive events from DevRev
const app = express();
app.use(bodyParser.json());

let receivedCallbacks: any[] = [];

// Endpoint to receive callbacks from DevRev
app.post('/callback', (req, res) => {
  console.log('Received callback:', JSON.stringify(req.body, null, 2));
  receivedCallbacks.push(req.body);
  res.status(200).send('OK');
});

// Start the callback server
const server = app.listen(CALLBACK_SERVER_PORT, () => {
  console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
});

// Cleanup function to close server after tests
afterAll((done) => {
  server.close(done);
});

// Clear received callbacks before each test
beforeEach(() => {
  receivedCallbacks = [];
});

describe('External Sync Unit Check Tests', () => {
  test('should emit EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event when processing the resource file', async () => {
    // Load the test event from the resource file
    let testEvents;
    try {
      const fileContent = fs.readFileSync(RESOURCE_FILE_PATH, 'utf8');
      testEvents = JSON.parse(fileContent);
    } catch (error) {
      fail(`Failed to load test event from resource file: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    
    expect(testEvents).toBeDefined();
    expect(Array.isArray(testEvents)).toBe(true);
    expect(testEvents.length).toBeGreaterThan(0);
    
    // Get the first event from the resource file
    const testEvent = testEvents[0];
    
    // Update the callback URL to point to our test server
    testEvent.payload.event_context.callback_url = `${CALLBACK_SERVER_URL}/callback`;
    
    // Send the event to the snap-in server
    try {
      const response = await axios.post(SNAP_IN_SERVER_URL, testEvent);
      
      // Verify the response
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.success).toBe(true);
    } catch (error) {
      fail(`Failed to send event to snap-in server: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    
    // Wait for the callback to be received (with timeout)
    try {
      await waitForCallback(10000);
    } catch (error) {
      fail(`${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    
    // Verify that we received at least one callback
    expect(receivedCallbacks.length).toBeGreaterThan(0);
    
    // Find the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event
    const doneEvent = receivedCallbacks.find(
      callback => callback.event_type === ExtractorEventType.ExtractionExternalSyncUnitsDone
    );
    
    // Verify the event was emitted
    expect(doneEvent).toBeDefined();
    expect(doneEvent?.event_type).toBe(ExtractorEventType.ExtractionExternalSyncUnitsDone);
    
    // Verify the event contains external sync units
    expect(doneEvent?.event_data).toBeDefined();
    expect(doneEvent?.event_data.external_sync_units).toBeDefined();
    expect(Array.isArray(doneEvent?.event_data.external_sync_units)).toBe(true);
    expect(doneEvent?.event_data.external_sync_units.length).toBeGreaterThan(0);
  }, 30000);
});

// Helper function to wait for a callback with timeout
async function waitForCallback(timeout: number): Promise<void> {
  const startTime = Date.now();
  
  while (receivedCallbacks.length === 0) {
    // Check if timeout has been reached
    if (Date.now() - startTime > timeout) {
      throw new Error(`Timed out waiting for callback after ${timeout}ms. No callbacks received from DevRev.`);
    }
    
    // Wait a short time before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}