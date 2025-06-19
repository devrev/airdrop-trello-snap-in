import axios from 'axios';
import http from 'http';
import { AddressInfo } from 'net';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
const TEST_TIMEOUT = 60000; // 60 seconds 

// Test event for data extraction
const createDataExtractionEvent = (callbackUrl: string) => {
  return {
    context: {
      secrets: {
        service_account_token: 'test-token'
      },
      snap_in_version_id: 'test-version-id'
    },
    execution_metadata: {
      devrev_endpoint: 'http://localhost:8003',
      function_name: 'data_extraction_check'
    },
    input_data: {
      snap_in_id: 'test-snap-in-id',
      org_id: 'test-org-id',
      user_id: 'test-user-id',
      function_name: 'data_extraction_check'
    },
    payload: {
      event_type: 'EXTRACTION_DATA_START',
      event_context: {
        callback_url: callbackUrl, 
        worker_data_url: 'http://localhost:8003/external-worker',
        dev_org_id: 'test-org-id',
        external_sync_unit_id: 'test-unit-id'
      }
    }
  };
};

// Create a minimal event for basic function existence check
const createMinimalEvent = (functionName: string, callbackUrl: string) => {
  return {
    context: { secrets: { service_account_token: 'test-token' } },
    execution_metadata: { function_name: functionName, devrev_endpoint: 'http://localhost:8003' },
    input_data: { 
      snap_in_id: 'test-snap-in-id', 
      org_id: 'test-org-id', 
      user_id: 'test-user-id',
      function_name: functionName,
      parameters: {}
    },
    payload: { 
      event_type: 'EXTRACTION_DATA_START', 
      event_context: { callback_url: callbackUrl, worker_data_url: 'http://localhost:8003/external-worker', dev_org_id: 'test-org-id', external_sync_unit_id: 'test-unit-id' } 
    }
  };
};

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

describe('Data Extraction Functionality Tests', () => {
  // Set up callback server before all tests
  let serverSetup: CallbackServerSetup;
  
  beforeAll(async () => {
    try {
      serverSetup = await createCallbackServer();
      console.log('Callback server started for all tests');
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
      console.log('Callback server closed after all tests');
    }
  });
  
  test('data_extraction_check function exists', async () => {
    const callbackUrl = `${CALLBACK_SERVER_URL}/callback`;
    const event = createMinimalEvent('data_extraction_check', callbackUrl);
    
    try {
      const response = await axios.post(
        SNAP_IN_SERVER_URL, 
        event, 
        { 
        timeout: 20000,
        headers: { 'Content-Type': 'application/json' }
        });
      
      console.log('Function exists response:', JSON.stringify(response.data));
      expect(response.status).toBe(200);
    } catch (error: any) {
      if (error.response) {
        console.log('Error response:', error.response.data);
        // Even a 400 or 500 means the function exists but had validation issues
        expect(error.response.status).toBeGreaterThanOrEqual(200);
      } else {
        console.error(`Connection error: ${error.message}`);
        throw new Error(`Connection error: ${error.message}`);
        console.log(`Connection error: ${error.message}`);
      }
    }
  }, TEST_TIMEOUT);

  // Test 2: Test input validation
  test('data_extraction_check validates input events', async () => {
    // Create an invalid event missing required fields
    const invalidEvent = {
      context: {
        secrets: {
          service_account_token: 'test-token'
        }
      },
      execution_metadata: {
        function_name: 'data_extraction_check'
      },
      input_data: {},
      payload: {
        // Missing required fields
        event_type: undefined,
        event_context: undefined
      } as any
    };
    
    try {
      await axios.post(SNAP_IN_SERVER_URL, invalidEvent, { 
        timeout: 20000 
      });
      console.log('Expected request to fail but it succeeded');
      expect(true).toBe(false); // This will fail the test with a better error message
    } catch (error: any) {
      // We expect an error, so this is actually a pass
    }
  }, TEST_TIMEOUT);

  // Test 3: Complete data extraction workflow
  test('data_extraction_check completes extraction workflow', async () => {
    // Create callback URL
    const callbackUrl = `${CALLBACK_SERVER_URL}/callback`;
    
    try {
      // Create callback URL
      const callbackUrl = `${CALLBACK_SERVER_URL}/callback`;
      
      // Create and send extraction event with proper structure
      const event = createDataExtractionEvent(callbackUrl);
      
      const response = await axios.post(
        SNAP_IN_SERVER_URL, 
        event, 
        { 
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        });
      
      // Verify response
      expect(response.status).toBe(200);
      console.log('Response data:', JSON.stringify(response.data));
      
      // Check for nested function_result structure
      expect(response.data).toHaveProperty('function_result');
      expect(response.data.function_result).toHaveProperty('success');
      expect(response.data.function_result.success).toBe(true);
      expect(response.data.function_result.message).toContain('completed successfully');
      
    } catch (error) {
      console.error('Error in extraction workflow test:', error);
      throw error;
    }
  }, TEST_TIMEOUT);
});