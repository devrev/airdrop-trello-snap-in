import axios from 'axios';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { AddressInfo } from 'net';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const TEST_TIMEOUT = 60000; // 60 seconds
const DATA_EXTRACTION_CHECK_FILE = path.resolve(__dirname, './data_extraction_check.json');

// Define interface for callback server return type
interface CallbackServerSetup {
  server: http.Server;
  receivedData: Promise<any[]>;
}

// Utility function to create a simple HTTP server for callbacks
const createCallbackServer = (): Promise<CallbackServerSetup> => {
  return new Promise<CallbackServerSetup>((resolve) => {
    let dataResolve: (value: any[]) => void;
    const receivedData = new Promise<any[]>((res) => {
      dataResolve = res;
    });

    const receivedPayloads: any[] = [];
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        console.log('Received data chunk:', chunk.toString());
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          receivedPayloads.push(data);
          dataResolve([...receivedPayloads]);
          console.log('Callback server received data:', JSON.stringify(data));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'success' }));
        } catch (error) {
          console.error('Error parsing JSON:', error);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
        }
      });
    });

    server.listen(CALLBACK_SERVER_PORT, '127.0.0.1', () => {
      const address = server.address() as AddressInfo; 
      console.log(`Callback server listening on port ${address.port}`);
      
      resolve({ server, receivedData });
    });
  });
};

describe('Acceptance Test - Data Extraction Check', () => {
  let serverSetup: CallbackServerSetup;
  
  beforeAll(async () => {
    try {
      serverSetup = await createCallbackServer();
      console.log('Callback server started for acceptance test');
    } catch (error) {
      console.error('Failed to create callback server:', error);
      throw error; // Fail the test suite if server creation fails
    }
  });
  
  afterAll(async () => {
    // Close the callback server if it exists
    if (serverSetup && serverSetup.server && serverSetup.server.listening) {
      await new Promise<void>((resolve) => {
        serverSetup.server.close(() => setTimeout(resolve, 100));
      });
      console.log('Callback server closed after acceptance test');
    }
  });
  
  test('data_extraction_check should complete with EXTRACTION_DATA_DONE event', async () => {
    // Check if the test data file exists
    expect(fs.existsSync(DATA_EXTRACTION_CHECK_FILE)).toBe(true);
    
    // Read the test event from the JSON file
    const testEventRaw = fs.readFileSync(DATA_EXTRACTION_CHECK_FILE, 'utf8');
    console.log('Read test event from file:', DATA_EXTRACTION_CHECK_FILE);
    
    // Parse the JSON file
    let testEvent;
    try {
      testEvent = JSON.parse(testEventRaw);
      console.log('Successfully parsed test event JSON');
    } catch (error) {
      console.error('Failed to parse test event JSON:', error);
      throw new Error(`Failed to parse test event JSON: ${error}`);
    }
    
    // Update the callback URL in the test event
    const callbackUrl = `${CALLBACK_SERVER_URL}/callback`;
    testEvent.payload.event_context.callback_url = callbackUrl;
    console.log('Updated callback URL in test event:', callbackUrl);
    
    try {
      // Send the event to the Snap-In server
      console.log('Sending test event to Snap-In server...');
      const response = await axios.post(
        SNAP_IN_SERVER_URL, 
        testEvent, 
        { 
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      console.log('Received response from Snap-In server:', JSON.stringify(response.data));
      expect(response.status).toBe(200);
      
      // Wait for callback data with timeout
      console.log('Waiting for callback data...');
      const receivedData = await Promise.race([
        serverSetup.receivedData,
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout waiting for callback data')), 30000)
        )
      ]);
      
      console.log('Received callback data:', JSON.stringify(receivedData));
      
      // Check if we received any data
      expect(receivedData).toBeDefined();
      expect(Array.isArray(receivedData)).toBe(true);
      expect(receivedData.length).toBeGreaterThan(0);
      
      // Find the EXTRACTION_DATA_DONE event
      const extractionDoneEvent = receivedData.find(
        (event) => event.event_type === 'EXTRACTION_DATA_DONE'
      );
      
      // Verify that we received the expected event
      expect(extractionDoneEvent).toBeDefined();
      expect(extractionDoneEvent.event_type).toBe('EXTRACTION_DATA_DONE');
      
      console.log('Successfully received EXTRACTION_DATA_DONE event');
    } catch (error: any) {
      console.error('Error in acceptance test:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }, TEST_TIMEOUT);
});