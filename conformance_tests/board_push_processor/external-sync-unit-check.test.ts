import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';
import fs from 'fs';
import path from 'path';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Interface for received events
interface ExternalSyncUnit {
  id: string;
  name: string;
  description: string;
  item_type: string;
  item_count?: number;
}

interface ReceivedEvent {
  event_type: string;
  event_context?: { callback_url: string; [key: string]: any };
  event_data?: { external_sync_units?: ExternalSyncUnit[]; artifacts?: any[] };
  timestamp: Date;
}

describe('External Sync Unit Check Tests', () => {
  let callbackServer: Server;
  let receivedEvents: ReceivedEvent[] = [];
  let testData: any;
  
  // Setup callback server before tests
  beforeAll(async () => {
    // Load test data from resource file
    const resourceFilePath = path.resolve(__dirname, 'trello_external_sync_unit_check.json');
    try {
      if (!fs.existsSync(resourceFilePath)) {
        throw new Error(`Resource file 'trello_external_sync_unit_check.json' not found at ${resourceFilePath}. Please ensure the file exists.`);
      }
      
      const fileContent = fs.readFileSync(resourceFilePath, 'utf8');
      testData = JSON.parse(fileContent);
      
      console.log(`Successfully loaded test data from resource file: ${resourceFilePath}`);
    } catch (error) {
      console.error('Error loading test data:', error);
      throw error;
    }
    
    // Setup callback server to receive events
    const app = express();
    app.use(bodyParser.json());
    
    app.post('/callback', (req, res) => {
      console.log('Callback server received event:', JSON.stringify(req.body, null, 2));
      
      // Store the received event with timestamp
      receivedEvents.push({
        ...req.body,
        timestamp: new Date()
      });
      
      res.status(200).send({ success: true });
    });
    
    return new Promise<void>((resolve) => {
      callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
        console.log(`Callback server started on port ${CALLBACK_SERVER_PORT}`);
        resolve();
      });
    });
  });
  
  // Cleanup after tests
  afterAll(async () => {
    if (callbackServer) {
      return new Promise<void>((resolve) => {
        callbackServer.close(() => {
          console.log('Callback server closed');
          resolve();
        });
      });
    }
  });
  
  // Test: External Sync Unit Check using resource file
  test('Should receive exactly one EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event', async () => {
    // Reset received events
    receivedEvents = [];
    
    try {
      // Ensure test data is loaded
      expect(testData).toBeDefined();
      expect(testData.payload).toBeDefined();
      expect(testData.payload.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
      
      // Update the callback URL in the test data to point to our test server
      testData.payload.event_context.callback_url = `${CALLBACK_SERVER_URL}/callback`;
      
      console.log('Sending test data to Test Snap-In Server...');
      
      // Send the test data to the Test Snap-In Server
      const response = await axios.post(SNAP_IN_SERVER_URL, testData);
      
      // Validate response
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      
      console.log('Response from Test Snap-In Server:', JSON.stringify(response.data, null, 2));
      
      // Wait for callback to receive events (give it enough time)
      console.log('Waiting for events to be received by callback server...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Log all received events for debugging
      console.log(`Received ${receivedEvents.length} events:`);
      receivedEvents.forEach((event, index) => {
        console.log(`Event ${index + 1}:`, JSON.stringify(event, null, 2));
      });
      
      // Verify that exactly one EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event was received
      const doneEvents = receivedEvents.filter(event => event.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
      
      if (doneEvents.length === 0) {
        throw new Error('No EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event was received. Check if the function is emitting the correct event type.');
      } else if (doneEvents.length > 1) {
        throw new Error(`Expected exactly one EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event, but received ${doneEvents.length}. Check if the function is emitting multiple events.`);
      }
      
      // Verify the event has the expected structure
      const doneEvent = doneEvents[0];
      expect(doneEvent).toHaveProperty('event_data');
      expect(doneEvent.event_data!).toHaveProperty('external_sync_units');
      expect(Array.isArray(doneEvent.event_data!.external_sync_units)).toBe(true);
      
      // Log the sync units for debugging
      console.log(`Received ${doneEvent.event_data!.external_sync_units?.length || 0} external sync units:`, 
        JSON.stringify(doneEvent.event_data!.external_sync_units, null, 2));
      
      // If there are sync units, verify their structure
      if (doneEvent.event_data!.external_sync_units && doneEvent.event_data!.external_sync_units.length > 0) {
        doneEvent.event_data!.external_sync_units.forEach((unit: ExternalSyncUnit, index: number) => {
          expect(unit).toHaveProperty('id', expect.any(String));
          expect(unit).toHaveProperty('name', expect.any(String));
          expect(unit).toHaveProperty('description', expect.any(String));
          expect(unit).toHaveProperty('item_type', expect.any(String));
        });
      }
      
    } catch (error) {
      console.error('Error in external sync unit check test:', error);
      throw error;
    }
  });
});