import axios from 'axios';
import { AxiosInstance, AxiosRequestConfig } from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server, IncomingMessage } from 'http';
import { createCallbackServer, waitForEvent } from './test-utils';
import http from 'http';

// Environment variables
const TRELLO_API_KEY = process.env.TRELLO_API_KEY || '';
const TRELLO_TOKEN = process.env.TRELLO_TOKEN || '';
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID || '';

// Server configurations
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Test timeout (allowing time for all operations)
jest.setTimeout(110000);

// Helper function to create event payload
const createEventPayload = (eventType: string, externalSyncUnitId?: string) => {
  return {
    execution_metadata: {
      function_name: 'extraction',
      devrev_endpoint: 'http://localhost:8003'
    },
    context: {
      secrets: {
        service_account_token: 'test-token'
      }
    },
    payload: {
      event_type: eventType,
      connection_data: {
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
        org_id: TRELLO_ORGANIZATION_ID,
        org_name: "Trello Organization"
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        external_sync_unit_id: externalSyncUnitId || '6752eb962a64828e59a35396',
        external_sync_unit: "Test Board",
        sync_unit_id: "984c894e-71e5-4e94-b484-40b839c9a916",
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_data: {}
    },
    input_data: {}
  };
};

// Helper function to send request to snap-in server
const callExtractionFunction = async (eventType: string, externalSyncUnitId?: string) => {
  const payload = createEventPayload(eventType, externalSyncUnitId);
  let retries = 2;
  let lastError: any = null;
  
  // Create a new axios instance for each request to avoid connection reuse issues
  const axiosConfig: AxiosRequestConfig = {
    // Add timeout to prevent hanging connections
    timeout: 30000,
    // Ensure proper connection handling
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    decompress: true,
    // Properly close connections after each request
    httpAgent: new http.Agent({ 
      keepAlive: false,
      maxSockets: 1
    }),
    headers: {
      'Connection': 'close'
    }
  };
  
  while (retries >= 0) {
    try {
      console.log(`Sending ${eventType} request to snap-in server (${retries} retries left)...`);
      
      // Create a fresh instance for each attempt
      const instance = axios.create(axiosConfig);
      
      const response = await instance.post(SNAP_IN_SERVER_URL, payload);
      
      // Explicitly destroy the agent to release connections
      if (instance.defaults.httpAgent) {
        instance.defaults.httpAgent.destroy();
      }
      
      return response.data;
    } catch (error) {
      // Properly handle error object with type checking
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }
      console.error(`Error calling extraction function (retries left: ${retries}):`, errorMessage);
      lastError = error;
      retries--;
      // Wait before retrying
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  
  throw lastError || new Error('Failed to call extraction function after multiple retries');
};

describe('Extraction Function Conformance Tests', () => {
  let callbackServer: Server;
  let callbackData: any[] = [];
  
  // Setup callback server before tests
  beforeAll((done) => {
    const app = express();
    app.use(bodyParser.json());
    
    // Endpoint to receive callback data
    app.post('*', (req, res) => {
      callbackData.push({
        path: req.path,
        body: req.body
      });
      res.status(200).send('OK');
    });
    
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
      done();
    });
  });
  
  // Clear callback data before each test
  beforeEach(() => {
    callbackData = [];
  });
  
  // Add delay between tests to allow server to recover
  afterEach(async () => {
    // Wait a bit between tests to allow connections to close
    await new Promise(resolve => setTimeout(resolve, 2000));
  });
  
  // Shutdown callback server after tests
  afterAll((done) => {
    callbackServer.close(() => {
      console.log('Callback server closed');
      done();
    });
  });
  
  // Test 1: Verify extraction function handles EXTRACTION_EXTERNAL_SYNC_UNITS_START event
  test('should handle EXTRACTION_EXTERNAL_SYNC_UNITS_START event', async () => {
    // Call the extraction function
    const result = await callExtractionFunction('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    
    console.log('Received result:', JSON.stringify(result, null, 2));
    // Verify the response indicates success
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(true);
    expect(result.function_result.message).toContain('Successfully pushed boards');
    
    // Wait for callback data
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Note: In a real environment, we would expect callback data with boards
    // but in our test setup, we're just verifying the function was called correctly
  });
  
  // Test 2: Verify extraction function handles EXTRACTION_METADATA_START event
  test('should handle EXTRACTION_METADATA_START event', async () => {
    // Call the extraction function
    const result = await callExtractionFunction('EXTRACTION_METADATA_START');
    
    console.log('Received result:', JSON.stringify(result, null, 2));
    // Verify the response indicates success
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(true);
    expect(result.function_result.message).toContain('Metadata extraction completed');
    
    // Wait for callback data
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  // Test 3: Verify extraction function handles EXTRACTION_DATA_START event
  test('should handle EXTRACTION_DATA_START event', async () => {
    // Call the extraction function with EXTRACTION_DATA_START event
    const result = await callExtractionFunction('EXTRACTION_DATA_START');
    
    console.log('Received result:', JSON.stringify(result, null, 2));
    // Verify the response indicates success
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(true);
    expect(result.function_result.message).toContain('Data extraction completed successfully');
    
    // Wait for callback data
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  // Test 4: Verify extraction function handles EXTRACTION_ATTACHMENTS_START event
  test('should handle EXTRACTION_ATTACHMENTS_START event', async () => {
    // Call the extraction function with EXTRACTION_ATTACHMENTS_START event
    const result = await callExtractionFunction('EXTRACTION_ATTACHMENTS_START');
    
    console.log('Received result:', JSON.stringify(result, null, 2));
    // Verify the response indicates success
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(true);
    expect(result.function_result.message).toContain('Attachments extraction completed');
    
    // Wait for callback data
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  // Test 5: Verify extraction function handles EXTRACTION_ATTACHMENTS_CONTINUE event
  test('should handle EXTRACTION_ATTACHMENTS_CONTINUE event', async () => {
    // Call the extraction function with EXTRACTION_ATTACHMENTS_CONTINUE event
    const result = await callExtractionFunction('EXTRACTION_ATTACHMENTS_CONTINUE');
    
    console.log('Received result:', JSON.stringify(result, null, 2));
    // Verify the response indicates success
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(true);
    expect(result.function_result.message).toContain('Attachments extraction completed');
    
    // Wait for callback data
    await new Promise(resolve => setTimeout(resolve, 1000));
  });
  
  // Test 6: Verify extraction function handles unsupported event type
  test('should handle unsupported event type', async () => {
    // Call the extraction function with an unsupported event type
    const result = await callExtractionFunction('UNSUPPORTED_EVENT_TYPE');
    
    console.log('Received result:', JSON.stringify(result, null, 2));
    // Verify the response indicates failure
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(false);
    expect(result.function_result.message).toContain('Unsupported event type');
  });
});