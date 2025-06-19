import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import fs from 'fs';
import path from 'path';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const RESOURCE_FILE_PATH = path.resolve(__dirname, '../[resource]external_sync_unit_check.json');
const TEST_TIMEOUT = 30000; // 30 seconds

describe('Acceptance Test - External Sync Unit Check', () => {
  let callbackServer: Server;
  let receivedData: any[] = [];
  let testPayload: any;

  beforeAll(async () => {
    // Start the callback server
    const app = express();
    app.use(express.json());
    
    app.post('/callback', (req, res) => {
      console.log('Callback server received data:', JSON.stringify(req.body, null, 2));
      receivedData.push(req.body);
      res.status(200).json({ success: true });
    });
    
    // Create a promise to wait for the server to start
    const serverStartPromise = new Promise<void>((resolve) => {
      callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
        console.log(`Callback server started on port ${CALLBACK_SERVER_PORT}`);
        resolve();
      });
    });
    
    await serverStartPromise;
    
    // Load the test payload from the resource file
    try {
      if (!fs.existsSync(RESOURCE_FILE_PATH)) {
        throw new Error(`Resource file not found at: ${RESOURCE_FILE_PATH}`);
      }
      
      const fileContent = fs.readFileSync(RESOURCE_FILE_PATH, 'utf8');
      testPayload = JSON.parse(fileContent);
      
      // Update the callback URL to point to our test server
      if (testPayload.payload && testPayload.payload.event_context) {
        testPayload.payload.event_context.callback_url = `${CALLBACK_SERVER_URL}/callback`;
      } else {
        throw new Error('Invalid test payload structure: missing payload.event_context');
      }
      
      console.log('Test payload loaded and configured');
    } catch (error) {
      console.error('Error loading test payload:', error);
      throw error;
    }
  });

  afterAll((done) => {
    // Close the callback server
    if (callbackServer) {
      callbackServer.close(() => {
        console.log('Callback server closed');
        done();
      });
    } else {
      done();
    }
  });

  beforeEach(() => {
    // Clear received data before each test
    receivedData = [];
  });

  test('Should receive EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event', async () => {
    // Skip the test if the payload wasn't loaded properly
    if (!testPayload) {
      console.error('Test payload not loaded, skipping test');
      return;
    }
    
    console.log('Sending request to Snap-In server...');
    
    // Invoke the function with the test payload
    try {
      const response = await axios.post(SNAP_IN_SERVER_URL, testPayload, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Response from Snap-In server:', JSON.stringify(response.data, null, 2));
      
      // Verify the response structure
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();
      
      // Wait for the callback to be received (up to 20 seconds)
      const maxWaitTime = 20000; // 20 seconds
      const startTime = Date.now();
      
      while (receivedData.length === 0 && Date.now() - startTime < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        console.log(`Waiting for callback... (${Math.round((Date.now() - startTime) / 1000)}s)`);
      }
      
      // Check if we received any data
      if (receivedData.length === 0) {
        throw new Error(`No callback received within ${maxWaitTime / 1000} seconds`);
      }
      
      console.log(`Received ${receivedData.length} callbacks`);
      
      // Find the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event
      const doneEvent = receivedData.find(data => 
        data && data.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE'
      );
      
      // Log all received events for debugging
      receivedData.forEach((data, index) => {
        console.log(`Callback ${index + 1}:`, JSON.stringify(data, null, 2));
      });
      
      // Verify we received the expected event
      expect(doneEvent).toBeDefined();
      expect(doneEvent.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
      
      // Verify the event has the expected structure
      expect(doneEvent.event_data).toBeDefined();
      expect(doneEvent.event_data.external_sync_units).toBeDefined();
      expect(Array.isArray(doneEvent.event_data.external_sync_units)).toBe(true);
      expect(doneEvent.event_data.external_sync_units.length).toBeGreaterThan(0);
      
      // Verify the structure of the external sync units
      const syncUnit = doneEvent.event_data.external_sync_units[0];
      expect(syncUnit).toHaveProperty('id');
      expect(syncUnit).toHaveProperty('name');
      expect(syncUnit).toHaveProperty('description');
      
    } catch (error: any) {
      console.error('Test failed with error:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }, TEST_TIMEOUT);
});