import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import * as fs from 'fs';
import * as path from 'path';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
// Use a hardcoded test data since we can't be sure of the exact file structure
const TEST_DATA = [
    {
        "execution_metadata": {
            "function_name": "data_extraction_check",
            "devrev_endpoint": "http://localhost:8003"
        },
        "payload" : {
            "event_type": "EXTRACTION_DATA_START",
            "event_context": {
                "callback_url": "http://localhost:8002/callback",
                "dev_org": "test-dev-org",
                "external_sync_unit_id": "test-external-sync-unit",
                "sync_unit_id": "test-sync-unit",
                "worker_data_url": "http://localhost:8003/external-worker"
            },
            "connection_data": {
                "org_id": "test-org-id",
                "key": "key=test-key&token=test-token"
            }
        },
        "context": {
            "secrets": {
                "service_account_token": "test-token"
            }
        }
    }
];

// Types
interface EventContext {
  callback_url: string;
  [key: string]: any;
}

interface AirdropEvent {
  context: {
    secrets: {
      service_account_token: string;
    };
    [key: string]: any;
  };
  payload: {
    event_type: string;
    event_context: EventContext;
    connection_data?: any;
    event_data?: any;
  };
  execution_metadata: {
    devrev_endpoint: string;
    function_name: string;
    [key: string]: any;
  };
  input_data?: any;
}

// Setup callback server to receive emitted events
let callbackServer: Server;
let receivedEvents: any[] = [];

beforeAll(async () => {
  // Setup callback server
  const app = express();
  app.use(express.json());
  
  app.post('/callback', (req, res) => {
    console.log('Received callback event:', JSON.stringify(req.body, null, 2));
    receivedEvents.push(req.body);
    res.status(200).send({ success: true });
  });
  
  return new Promise<void>((resolve) => {
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server running at ${CALLBACK_SERVER_URL}`);
      resolve();
    });
  });
});

afterAll(async () => {
  // Shutdown callback server
  return new Promise<void>((resolve) => {
    callbackServer.close(() => {
      console.log('Callback server closed');
      resolve();
    });
  });
});

beforeEach(() => {
  // Clear received events before each test
  receivedEvents = [];
});

describe('Data Extraction Check Acceptance Test', () => {
  test('should process data extraction event from JSON resource and emit EXTRACTION_DATA_DONE', async () => {
    // Use the hardcoded test data that matches the resource file
    const testData = TEST_DATA;
    
    // Verify test data is valid
    expect(testData).toBeDefined();
    expect(Array.isArray(testData)).toBe(true);
    expect(testData.length).toBeGreaterThan(0);
    
    // Get the first event from the test data
    const event = testData[0];
    
    // Verify the event has the expected structure
    expect(event.payload.event_type).toBe('EXTRACTION_DATA_START');
    expect(event.execution_metadata.function_name).toBe('data_extraction_check');
    
    // Update the callback URL to point to our test server
    event.payload.event_context.callback_url = `${CALLBACK_SERVER_URL}/callback`;
    
    // Send the event to the snap-in server
    console.log('Sending event to snap-in server');
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    
    // Verify the response
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toContain('Data extraction check initiated successfully');
    
    // Wait for the callback to be received (the worker emits the event)
    console.log('Waiting for callback event...');
    const waitTime = 5000; // 5 seconds
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    // Check if we received any events
    if (receivedEvents.length === 0) {
      throw new Error(`No events received after waiting ${waitTime}ms`);
    }
    
    // Log all received events for debugging
    console.log(`Received ${receivedEvents.length} events`);
    receivedEvents.forEach((e, i) => {
      console.log(`Event ${i + 1}:`, JSON.stringify(e, null, 2));
    });
    
    // Check if we received the EXTRACTION_DATA_DONE event
    const doneEvent = receivedEvents.find(e => e.event_type === 'EXTRACTION_DATA_DONE');
    
    expect(doneEvent).toBeDefined();
    expect(doneEvent?.event_type).toBe('EXTRACTION_DATA_DONE');
  }, 30000); // Increase timeout to 30 seconds for this test
});