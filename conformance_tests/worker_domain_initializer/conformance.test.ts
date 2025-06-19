import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Environment variables
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

// Check required environment variables
if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
  console.error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  process.exit(1);
}

// Setup callback server
let callbackServer: Server;
let lastCallbackData: any = null;

beforeAll(async () => {
  // Create a simple Express server to receive callbacks
  const app = express();
  app.use(express.json());

  app.post('/callback', (req, res) => {
    lastCallbackData = req.body;
    res.status(200).send({ success: true });
  });
  
  // Start the callback server
  return new Promise<void>((resolve) => {
    callbackServer = app.listen(CALLBACK_SERVER_PORT, '0.0.0.0', () => {
      const address = callbackServer.address() as AddressInfo;
      console.log(`Callback server running at http://localhost:${address.port}`);
      resolve();
    });
  });
});

afterAll(async () => {
  // Close the callback server
  if (callbackServer) {
    return new Promise<void>((resolve) => {
      callbackServer.close(() => {
        console.log('Callback server closed');
        resolve();
      });
    });
  }
});

// Helper function to create a request payload
function createRequestPayload(functionName: string, eventType?: string, additionalContext: any = {}) {
  return {
    execution_metadata: {
      function_name: functionName,
      devrev_endpoint: 'http://localhost:8003',
    },
    context: {
      secrets: {
        service_account_token: 'test-token',
      },
      snap_in_id: 'test-snap-in-id',
    },
    payload: {
      connection_data: {
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
        org_id: TRELLO_ORGANIZATION_ID,
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-dev-user',
        dev_user_id: 'test-dev-user-id',
        external_sync_unit: 'test-board',
        external_sync_unit_id: 'test-board-id',
        external_sync_unit_name: 'Test Board',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'test-import',
        request_id: 'test-request-id',
        ...additionalContext,
      },
    },
  };
}

// Test 1: Basic test for can_invoke function
test('Test 1: can_invoke function works correctly', async () => {
  const response = await axios.post(
    SNAP_IN_SERVER_URL,
    createRequestPayload('can_invoke', undefined)
  );
  
  expect(response.status).toBe(200);
  expect(response.data.function_result).toHaveProperty('success', true);
  expect(response.data.function_result).toHaveProperty('message');
});

// Test 2: Simple test for check_auth function
test('Test 2: check_auth function works with provided credentials', async () => {
  const response = await axios.post(
    SNAP_IN_SERVER_URL,
    createRequestPayload('check_auth', undefined)
  );
  
  expect(response.status).toBe(200);
  expect(response.data.function_result).toHaveProperty('authenticated');
  
  // If authentication fails, log the error details for debugging
  if (!response.data.function_result.authenticated) {
    console.error('Authentication failed:', response.data.function_result.message);
    if (response.data.function_result.details) {
      console.error('Details:', response.data.function_result.details);
    }
  }
  
  expect(response.data.function_result.authenticated).toBe(true);
});

// Test 3: Moderate test for extraction_external_sync_unit_check function
test('Test 3: extraction_external_sync_unit_check uses initial domain mapping', async () => {
  const response = await axios.post(
    SNAP_IN_SERVER_URL,
    {
      ...createRequestPayload('extraction_external_sync_unit_check', undefined),
      payload: {
        ...createRequestPayload('extraction_external_sync_unit_check', undefined).payload,
        event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
        mode: 'INITIAL',
        worker_data_url: 'http://localhost:8003/external-worker'
      }
    }
  );
  
  expect(response.status).toBe(200);
  expect(response.data.function_result).toHaveProperty('success');
  
  // If the function fails, log the error details for debugging
  if (!response.data.function_result.success) {
    console.error('External sync unit check failed:', response.data.function_result.message);
    if (response.data.function_result.details) {
      console.error('Details:', response.data.function_result.details);
    }
  }
  
  expect(response.data.function_result.success).toBe(true);
  expect(response.data.function_result.message).toContain('completed successfully');
});

// Test 4: Complex test for data_extraction_check function
test('Test 4: data_extraction_check uses initial domain mapping', async () => {
  const response = await axios.post(
    SNAP_IN_SERVER_URL,
    {
      ...createRequestPayload('data_extraction_check', undefined),
      payload: {
        ...createRequestPayload('data_extraction_check', undefined).payload,
        event_type: 'EXTRACTION_DATA_START',
        mode: 'INITIAL',
        worker_data_url: 'http://localhost:8003/external-worker'
      }
    }
  );
  
  expect(response.status).toBe(200);
  expect(response.data.function_result).toHaveProperty('success');

  // If the function fails, log the error details for debugging
  if (!response.data.function_result.success) {
    console.error('Data extraction check failed:', response.data.function_result.message);
    if (response.data.function_result.details) {
      console.error('Details:', response.data.function_result.details);
    }
  }
  
  expect(response.data.function_result.success).toBe(true);
  expect(response.data.function_result.message).toContain('completed successfully');
});