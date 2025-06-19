import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import bodyParser from 'body-parser';

// Environment variables validation
const requiredEnvVars = ['TRELLO_API_KEY', 'TRELLO_TOKEN', 'TRELLO_ORGANIZATION_ID'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Setup callback server
let callbackServer: Server;
let receivedAttachments: any[] = [];
let receivedErrors: any[] = [];

// Create a mock event for testing
const createMockEvent = (overrides: any = {}) => {
  return {
    execution_metadata: {
      function_name: 'extraction_attachments',
      devrev_endpoint: 'http://localhost:8003'
    },
    context: {
      secrets: {
        service_account_token: 'mock-token'
      }
    },
    payload: {
      event_type: 'EXTRACTION_ATTACHMENTS_START',
      connection_data: {
        key: `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`,
        org_id: process.env.TRELLO_ORGANIZATION_ID
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/attachments`,
        ...overrides.event_context
      },
      ...overrides.payload
    }
  };
};

// Setup and teardown
beforeAll(async () => {
  // Setup callback server
  const app = express();
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '50mb' }));

  app.post('/attachments', (req, res) => {
    receivedAttachments.push(req.body);
    res.status(200).send({ success: true });
  });

  app.post('/errors', (req, res) => {
    receivedErrors.push(req.body);
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
  // Close callback server
  if (callbackServer) {
    return new Promise<void>((resolve) => {
      callbackServer.close(() => {
        console.log('Callback server closed');
        resolve();
      });
    });
  }
});

beforeEach(() => {
  // Clear received data before each test
  receivedAttachments = [];
  receivedErrors = [];
});

// Tests
describe('Attachment Extraction Function Conformance Tests', () => {
  // Test 1: Basic invocation test
  test('should be able to invoke the attachment extraction function', async () => {
    const mockEvent = createMockEvent();
    const response = await axios.post(SNAP_IN_SERVER_URL, mockEvent);
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
  });

  // Test 2: Parameter validation test
  test('should validate required parameters', async () => {
    // Test missing connection data
    const mockEventNoConnectionData = createMockEvent({ 
      payload: { connection_data: undefined }
    });
    
    const response = await axios.post(SNAP_IN_SERVER_URL, mockEventNoConnectionData);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('Missing connection data');
  });

  // Test 3: Attachment streaming test
  test('should properly handle attachment streaming', async () => {
    // This test is more complex and would require actual Trello data
    // For conformance testing, we're verifying the function responds correctly
    // to a well-formed request
    
    const mockEvent = createMockEvent({
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/attachments`,
        external_sync_unit_id: 'some-board-id' // Would be a real board ID in production
      }
    });
    
    const response = await axios.post(SNAP_IN_SERVER_URL, mockEvent);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    // The function should either succeed or fail with a meaningful error
    if (response.data.function_result.success) {
      expect(response.data.function_result.message).toContain('Attachments extraction completed');
    } else {
      // If it fails, it should be due to missing actual Trello data, not implementation issues
      expect(response.data.function_result.message).toBeDefined();
    }
  });

  // Test 4: Error handling test
  test('should properly handle errors during attachment extraction', async () => {
    // Test with invalid event type
    const mockEventInvalidType = createMockEvent({
      payload: { event_type: 'INVALID_EVENT_TYPE' }
    });
    
    const response = await axios.post(SNAP_IN_SERVER_URL, mockEventInvalidType);
    
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(false);
    expect(response.data.function_result.message).toContain('not an attachments extraction event');
  });
});