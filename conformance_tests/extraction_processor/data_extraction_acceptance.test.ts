import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser'; 
import { Server } from 'http';
import fs from 'fs';
import http from 'http';
import path from 'path';

// Environment variables
const TRELLO_API_KEY = process.env.TRELLO_API_KEY || '';
const TRELLO_TOKEN = process.env.TRELLO_TOKEN || '';
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID || '';

// Server configurations with longer timeout for processing
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const CALLBACK_PATH = '/callback'; 

// Test timeout (allowing time for all operations)
jest.setTimeout(110000);
  
// Check if required environment variables are set and provide fallbacks for testing
beforeAll(() => {
  if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
    console.warn('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
    console.error('These are required for the tests to run properly.');
    throw new Error('Missing required environment variables');
  }
});

describe('Data Extraction Acceptance Test', () => {
  let callbackServer: Server;
  let receivedEvents: any[] = []; 
  
  // Setup callback server before tests
  beforeAll((done) => {
    const app = express();
    app.use(bodyParser.json({ limit: '100mb' }));
    
    // Endpoint to receive callback data
    app.post(CALLBACK_PATH, (req, res) => {
      console.log(`Received callback event with type: ${req.body.event_type}`);
      receivedEvents.push(req.body);
      console.log(`Total events received: ${receivedEvents.length}`);
      res.status(200).send('OK');
    });
    
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
      done();
    });
  });
  
  // Clear received events before each test 
  beforeEach(() => {
    receivedEvents = [];
  });
  
  // Shutdown callback server after tests
  afterAll((done) => {
    callbackServer.close(() => {
      console.log('Callback server closed');
      done();
    });
  });
  
  // Create a custom HTTP agent that doesn't reuse connections
  const createAgent = () => {
    return new http.Agent({  
      keepAlive: false, maxSockets: 1, timeout: 60000 
    });
  };
  
  test('should process data extraction without emitting EXTRACTION_DATA_ERROR event', async () => {
    try {
      // Load test data from the resource file
      // Try different possible paths for the resource file
      let testDataPath = path.resolve(__dirname, 'resources/data_extraction_test.json'); 
      if (!fs.existsSync(testDataPath)) {
        testDataPath = path.resolve(__dirname, '../resources/data_extraction_test.json');
      }
      
      if (!fs.existsSync(testDataPath)) {
        fs.mkdirSync(path.resolve(__dirname, 'resources'), { recursive: true });
        throw new Error(`Test data file not found at path: ${testDataPath}`);
      }
      
      const testDataRaw = fs.readFileSync(testDataPath, 'utf8');
      let testData;
      
      try {
        testData = JSON.parse(testDataRaw);
      } catch (error) {
        throw new Error(`Failed to parse test data JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      if (!Array.isArray(testData) || testData.length === 0) {
        throw new Error('Test data is not a valid array or is empty');
      }
      
      // Modify the test data to use our callback URL 
      const eventData = JSON.parse(JSON.stringify(testData[0])); // Deep clone to avoid modifying original
      if (!eventData.payload || !eventData.payload.event_context) {
        throw new Error('Test data is missing payload.event_context');
      }
      
      eventData.payload.event_context.callback_url = `${CALLBACK_SERVER_URL}${CALLBACK_PATH}`;

      // Replace placeholder credentials with real ones from environment variables
      if (eventData.payload.connection_data) {
        eventData.payload.connection_data.key = `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
        eventData.payload.connection_data.org_id = TRELLO_ORGANIZATION_ID;
        
        // Ensure we have a valid board ID for testing
        if (eventData.payload.event_context && !eventData.payload.event_context.external_sync_unit_id) {
          console.log('Adding a test board ID to event context');
          eventData.payload.event_context.external_sync_unit_id = '6752eb962a64828e59a35396'; // Use a known board ID
        }
      }
      
      // Log the test data for debugging
      console.log('Sending test data to snap-in server:', JSON.stringify(eventData, null, 2));

      // Send the test data to the snap-in server
      let response;
      try {
        // Create a fresh axios instance with a new agent
        const instance = axios.create({
          // Add timeout to prevent hanging connections
          timeout: 60000,
          // Ensure proper connection handling
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          decompress: true,
          // Properly close connections
          httpAgent: createAgent(),
          validateStatus: () => true,
          headers: {
            'Connection': 'close'
          }
        });
        
        response = await instance.post(SNAP_IN_SERVER_URL, eventData); 
        
        console.log('Received response from snap-in server:', JSON.stringify(response.data, null, 2));
        
      } catch (error) {
        console.error('Error sending request to snap-in server:', error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
      
      // Wait for the callback event (giving enough time for processing) 
      const maxWaitTime = 60000; // 60 seconds
      const checkInterval = 1000; // 1 second
      let waitTime = 0;
      
      while (waitTime < maxWaitTime) {
        if (receivedEvents.length > 0) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        waitTime += checkInterval; 
        console.log(`Waiting for callback events... (${waitTime}ms elapsed)`);
      }
      
      // Verify that at least one event was received
      expect(receivedEvents.length).toBeGreaterThan(0);
      if (receivedEvents.length === 0) {
        console.error('No events received from callback');
        return;
      }
      
      console.log(`Received ${receivedEvents.length} events. Event types:`,
        receivedEvents.map(e => e.event_type).join(', '));
       
      // Check that no EXTRACTION_DATA_ERROR event was received
      const errorEvent = receivedEvents.find(event => event.event_type === 'EXTRACTION_DATA_ERROR');
      
      if (errorEvent) {
        console.error('Found EXTRACTION_DATA_ERROR event, which indicates failure:');
        if (errorEvent.event_data && errorEvent.event_data.error) {
          console.error('Error details:', errorEvent.event_data.error);
        }
        expect(errorEvent).toBeUndefined(); // Use expect instead of fail
      }
      
      // Check for EXTRACTION_DATA_DONE or EXTRACTION_DATA_PROGRESS events
      const doneEvent = receivedEvents.find(event => event.event_type === 'EXTRACTION_DATA_DONE');
      const progressEvent = receivedEvents.find(event => event.event_type === 'EXTRACTION_DATA_PROGRESS');
      
      if (doneEvent) {
        console.log('Found EXTRACTION_DATA_DONE event, test passed.');
      } else if (progressEvent) {
        console.log('Found EXTRACTION_DATA_PROGRESS event, which indicates the extraction is in progress.');
      } else {
        console.warn('No EXTRACTION_DATA_DONE or EXTRACTION_DATA_PROGRESS events found, but no error events either.');
        console.warn('Received event types:', receivedEvents.map(e => e.event_type).join(', '));
      }
      
      // Test passes as long as no EXTRACTION_DATA_ERROR event was received
      expect(errorEvent).toBeUndefined();
      
    } catch (error) {
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }
      console.error('Error in data extraction acceptance test:', errorMessage);
      expect(error).toBeUndefined(); // Use expect instead of fail
    }
  });
});