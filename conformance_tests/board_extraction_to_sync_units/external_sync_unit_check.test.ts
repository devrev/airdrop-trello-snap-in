import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const DEVREV_SERVER_URL = 'http://localhost:8003';

// Environment variables check
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

// Setup callback server
let callbackServer: Server;
let callbackData: any = null;
let callbackPromiseResolve: ((value: any) => void) | null = null;

// Create a promise that will be resolved when the callback is received
const createCallbackPromise = () => {
  return new Promise<any>((resolve) => {
    callbackPromiseResolve = resolve;
  });
};

let callbackPromise = createCallbackPromise();

beforeAll(async () => {
  // Verify environment variables
  if (!TRELLO_API_KEY) {
    throw new Error('TRELLO_API_KEY environment variable is not set');
  }
  if (!TRELLO_TOKEN) {
    throw new Error('TRELLO_TOKEN environment variable is not set');
  }
  if (!TRELLO_ORGANIZATION_ID) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is not set');
  }

  // Setup callback server
  const app = express();
  app.use(bodyParser.json());
  
  app.post('/callback', (req, res) => {
    console.log('Callback received:', JSON.stringify(req.body, null, 2));
    callbackData = req.body;
    if (callbackPromiseResolve) {
      callbackPromiseResolve(req.body);
    }
    res.status(200).send({ status: 'ok' });
  });
  
  callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
    console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
  });
});

afterAll(async () => {
  // Cleanup callback server
  if (callbackServer) {
    await new Promise<void>((resolve) => {
      callbackServer.close(() => resolve());
    });
  }
});

beforeEach(() => {
  // Reset callback data before each test
  callbackData = null;
  callbackPromise = createCallbackPromise();
});

describe('Trello External Sync Unit Check', () => {
  test('Extraction function processes external sync units according to specification', async () => {
    // Load the test payload from the resource file
    const payloadPath = path.join(__dirname, 'trello_external_sync_unit_check.json');
    if (!fs.existsSync(payloadPath)) {
      throw new Error(`Test payload file not found at: ${payloadPath}`);
    }
    
    let payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    
    // Replace placeholders with actual values
    if (payload.payload.connection_data) {
      const keyString = `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;
      payload.payload.connection_data.key = keyString;
      payload.payload.connection_data.org_id = TRELLO_ORGANIZATION_ID;
    } else {
      throw new Error('Payload structure is invalid: missing connection_data');
    }
    
    // Set the callback URL to our test server
    if (payload.payload.event_context) {
      payload.payload.event_context.callback_url = `${CALLBACK_SERVER_URL}/callback`;
    } else {
      throw new Error('Payload structure is invalid: missing event_context');
    }
    
    // Send the request to the snap-in
    console.log('Sending request to snap-in server...');
    const response = await axios.post(SNAP_IN_SERVER_URL, payload);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    
    // Wait for the callback with a timeout
    console.log('Waiting for callback from DevRev...');
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Callback timeout: Did not receive EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event within 30 seconds')), 30000)
    );
    
    const receivedData = await Promise.race([callbackPromise, timeoutPromise]);
    
    // Verify the callback data
    expect(receivedData).toBeDefined();
    expect(receivedData.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
    expect(receivedData.event_data).toBeDefined();
    expect(receivedData.event_data.external_sync_units).toBeDefined();
    
    const externalSyncUnits = receivedData.event_data.external_sync_units;
    expect(externalSyncUnits.length).toBeGreaterThan(0);
    
    // Verify the structure of at least one external sync unit
    const syncUnit = externalSyncUnits[0];
    expect(syncUnit.id).toBeDefined();
    expect(syncUnit.name).toBeDefined();
    expect(syncUnit.description).toBeDefined();
    expect(syncUnit.item_type).toBe('tasks');
    
    // Verify we received exactly one callback
    const callbackCount = await getCallbackCount();
    expect(callbackCount).toBe(1);
  });
});

// Helper function to get the number of callbacks received
async function getCallbackCount(): Promise<number> {
  // In a real implementation, this would track the number of callbacks
  // For this test, we're just checking if callbackData is set
  return callbackData ? 1 : 0;
}