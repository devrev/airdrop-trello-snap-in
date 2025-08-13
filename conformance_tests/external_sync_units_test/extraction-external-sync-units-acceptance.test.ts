import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { CallbackServer } from './callback-server';

const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const REQUEST_TIMEOUT = 15000; // 15 seconds timeout for requests
const CALLBACK_WAIT_TIMEOUT = 15000; // 15 seconds timeout for waiting for callback

// The test event from the resource
const testEvent = {
    "execution_metadata": {
        "function_name": "test_external_sync_units",
        "devrev_endpoint": "http://localhost:8003"
    },
    "payload" : {
        "event_type": "EXTRACTION_EXTERNAL_SYNC_UNITS_START",
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
};

describe('External Sync Units Extraction Acceptance Test', () => {
  let callbackServer: CallbackServer;

  beforeAll(async () => {
    // Start the callback server
    callbackServer = new CallbackServer(CALLBACK_SERVER_PORT);
    await callbackServer.start();
  });

  afterAll(async () => {
    // Stop the callback server
    await callbackServer.stop();
  });

  beforeEach(() => {
    // Clear callback data before each test
    callbackServer.clearCallbackData();
  });

  test('Should receive EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event after triggering extraction', async () => {
    // Send the request to the snap-in server
    try {
      console.log('Sending request to snap-in server with event:', JSON.stringify(testEvent).substring(0, 500) + '...');
      const response = await axios.post(SNAP_IN_SERVER_URL, testEvent, { timeout: REQUEST_TIMEOUT });
      
      console.log('Received response from snap-in server:', JSON.stringify(response.data).substring(0, 500) + '...');
      
      // Verify the response status
      expect(response.status).toBe(200);
      
      // Wait for the callback to be received
      console.log('Waiting for callback...');
      const callbackReceived = await waitForCallback(
        () => {
          const callbackData = callbackServer.getCallbackData();
          return callbackData.some(data => data.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
        },
        CALLBACK_WAIT_TIMEOUT
      );
      
      // Verify that we received the callback
      expect(callbackReceived).toBe(true);
      
      // Get the callback data
      const callbackData = callbackServer.getCallbackData() || [];
      console.log('Received callback data (count):', callbackData.length);
      if (callbackData.length > 0) {
        console.log('First callback data:', JSON.stringify(callbackData[0]).substring(0, 500) + '...');
      }
      
      // Find the callback with the expected event type
      const extractionDoneCallback = callbackData.find(data => data.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
      
      if (!extractionDoneCallback) {
        console.log('No callback with event_type EXTRACTION_EXTERNAL_SYNC_UNITS_DONE found');
        console.log('Available event types:', callbackData.map(data => data.event_type).join(', '));
      }
      
      // Verify that we found the callback with the expected event type
      expect(extractionDoneCallback).toBeDefined();
      
      // Verify that the callback contains event_data with external_sync_units
      expect(extractionDoneCallback).toHaveProperty('event_data');
      expect(extractionDoneCallback?.event_data).toHaveProperty('external_sync_units');
      
      // Verify that external_sync_units is an array
      const externalSyncUnits = extractionDoneCallback?.event_data?.external_sync_units;
      expect(Array.isArray(externalSyncUnits)).toBe(true);
      
    } catch (error) {
      // Provide detailed error information
      fail(`Test failed: ${handleAxiosError(error)}`);
    }
  });
});

// Helper function to wait for a condition to be true
async function waitForCallback(
  conditionFn: () => boolean,
  timeout: number
): Promise<boolean> {
  console.log('Starting to wait for callback...');
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (conditionFn()) {
      return true;
    }
    // Wait a short time before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  console.log('Timeout waiting for callback');
  
  return false;
}

// Helper function to handle Axios errors
function handleAxiosError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data 
      ? typeof error.response.data === 'string' 
        ? error.response.data 
        : JSON.stringify(error.response.data)
      : 'No response data';
    
    return `${error.message} (${error.code}). Status: ${error.response?.status}. Response: ${responseData}`;
  }
  
  return String(error);
}

// Define fail function to replace the undefined fail calls
function fail(message: string): never {
  throw new Error(message);
}