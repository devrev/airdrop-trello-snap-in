import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import bodyParser from 'body-parser';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Types
interface CallbackData {
  event_type: string;
  data?: any;
  error?: any;
}

// Test environment setup
describe('Trello Snap-In Push Users Function Conformance Tests', () => {
  let callbackServer: Server;
  let receivedCallbacks: CallbackData[] = [];
  
  // Setup callback server before tests
  beforeAll(async () => {
    // Check required environment variables
    const requiredEnvVars = [
      'TRELLO_API_KEY',
      'TRELLO_TOKEN',
      'TRELLO_ORGANIZATION_ID'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
      }
    }
    
    // Setup callback server
    const app = express();
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    
    app.post('*', (req, res) => {
      receivedCallbacks.push(req.body);
      res.status(200).send({ success: true });
    });
    
    return new Promise<void>((resolve) => {
      callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
        console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
        resolve();
      });
    });
  });
  
  // Clean up after tests
  afterAll(() => {
    if (callbackServer) {
      callbackServer.close();
    }
  });
  
  // Reset callbacks before each test
  beforeEach(() => {
    receivedCallbacks = [];
  });
  
  // Test 1: Basic setup test
  test('Environment variables are properly set', () => {
    expect(process.env.TRELLO_API_KEY).toBeDefined();
    expect(process.env.TRELLO_TOKEN).toBeDefined();
    expect(process.env.TRELLO_ORGANIZATION_ID).toBeDefined();
  });
  
  // Test 2: Server connectivity test
  test('Can connect to the Test Snap-In Server', async () => {
    // Simple ping to check if server is running
    const pingEvent = {
      execution_metadata: {
        function_name: 'can_invoke'
      },
      payload: {}
    };
    
    const response = await axios.post(SNAP_IN_SERVER_URL, pingEvent);
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
  });
  
  // Test 3: Callback server test
  test('Callback server can receive data', async () => {
    const testData = { test: 'data' };
    await axios.post(CALLBACK_SERVER_URL, testData);
    expect(receivedCallbacks.length).toBe(1);
    expect(receivedCallbacks[0]).toEqual(testData);
  });
  
  // Test 4: Function invocation test
  test('extraction_users function can be invoked', async () => {
    const event = {
      execution_metadata: {
        function_name: 'extraction_users',
        devrev_endpoint: 'http://localhost:8003'
      },
      context: {
        secrets: {
          service_account_token: 'test-token'
        }
      },
      payload: {
        event_type: 'EXTRACTION_DATA_START',
        connection_data: {
          key: `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`,
          org_id: process.env.TRELLO_ORGANIZATION_ID
        },
        event_context: {
          callback_url: `${CALLBACK_SERVER_URL}/callback`,
          dev_org: 'test-org',
          dev_org_id: 'test-org-id',
          dev_user: 'test-user',
          dev_user_id: 'test-user-id',
          worker_data_url: 'http://localhost:8003/external-worker',
          request_id: 'test-request-id'
        }
      }
    };
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.error).toBeUndefined();
  });
  
  // Test 5: Data processing test
  test('extraction_users function processes and pushes user data correctly', async () => {
    // Create the event for extraction_users function
    const event = {
      execution_metadata: {
        function_name: 'extraction_users',
        devrev_endpoint: 'http://localhost:8003'
      },
      context: {
        secrets: {
          service_account_token: 'test-token'
        }
      },
      payload: {
        event_type: 'EXTRACTION_DATA_START',
        connection_data: {
          key: `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`,
          org_id: process.env.TRELLO_ORGANIZATION_ID
        },
        event_context: {
          callback_url: `${CALLBACK_SERVER_URL}/callback`,
          dev_org: 'test-org',
          dev_org_id: 'test-org-id',
          dev_user: 'test-user',
          dev_user_id: 'test-user-id',
          worker_data_url: 'http://localhost:8003/external-worker',
          request_id: 'test-request-id',
          repositories: {
            users: `${CALLBACK_SERVER_URL}/users`
          }
        }
      }
    };
    
    // Send the event to the Test Snap-In Server
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.error).toBeUndefined();
    
    // Wait for the worker to complete with a more robust mechanism
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 1000; // 1 second
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      if (receivedCallbacks.length > 0) {
        // Check if we have received a completion event
        const completionEvent = receivedCallbacks.find(
          callback => callback.event_type === 'EXTRACTION_DATA_DONE'
        );
        
        if (completionEvent) {
          break;
        }
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    // Verify that we received callbacks
    expect(receivedCallbacks.length).toBeGreaterThan(0);
    
    // Check for extraction events
    const progressEvent = receivedCallbacks.find(callback => callback.event_type === 'EXTRACTION_DATA_PROGRESS');
    const doneEvent = receivedCallbacks.find(callback => callback.event_type === 'EXTRACTION_DATA_DONE');
    const errorEvent = receivedCallbacks.find(callback => callback.event_type === 'EXTRACTION_DATA_ERROR');
    
    expect(errorEvent).toBeUndefined();
    expect(progressEvent || doneEvent).toBeDefined();
  });
});