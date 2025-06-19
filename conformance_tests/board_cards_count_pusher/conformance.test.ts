import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';

// Server configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const WORKER_DATA_URL = 'http://localhost:8003/external-worker';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Environment variables check
const requiredEnvVars = [
  'TRELLO_API_KEY',
  'TRELLO_TOKEN',
  'TRELLO_ORGANIZATION_ID'
];

// Timeout settings - increased to allow for processing time
const CALLBACK_TIMEOUT = 90000; // 90 seconds

// Interface for the external sync unit
interface ExternalSyncUnit {
  id: string;
  name: string;
  description: string;
  item_type: string;
  item_count: number;
}

// Create a more complete event payload
interface EventPayload {
  event_type: string;
  connection_data: any;
  event_context: any;
  [key: string]: any;
}

// Interface for ADaaS event
interface AdaasEvent {
  event_type: string;
  event_context: any;
  event_data: any;
}

// Test suite for Trello Snap-In conformance
describe('Trello Snap-In Conformance Tests', () => {
  let callbackServer: Server;
  let receivedSyncUnits: ExternalSyncUnit[] = [];
  let callbackPromiseResolve: ((value: unknown) => void) | null = null;
  
  // Setup callback server before tests
  beforeAll(async () => {
    // Check environment variables
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
      }
    }
    
    // Setup callback server
    const app = express();
    app.use(bodyParser.json());

    // Endpoint to receive ADaaS events
    app.post('/adaas-event', (req, res) => {
      console.log('ADaaS event endpoint received data:', JSON.stringify(req.body, null, 2));
      
      try {
        const adaasEvent: AdaasEvent = req.body;
        
        // Check if this is an external sync units done event
        if (adaasEvent.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE' && 
            adaasEvent.event_data && 
            adaasEvent.event_data.external_sync_units) {
          
          // Forward the external sync units to our callback endpoint
          axios.post(`${CALLBACK_SERVER_URL}/callback`, {
            external_sync_units: adaasEvent.event_data.external_sync_units
          }).catch(err => console.error('Error forwarding to callback:', err));
        }
        
        // Always return success to the snap-in
        res.status(200).send({ success: true });
      } catch (error) {
        console.error('Error processing ADaaS event:', error);
        res.status(200).send({ success: true }); // Still return success to avoid blocking the snap-in
      }
    });
    
    // Endpoint to receive external sync units
    app.post('/callback', (req, res) => {
      console.log('Callback server received data:', JSON.stringify(req.body, null, 2));
      
      if (req.body && req.body.external_sync_units) {
        receivedSyncUnits = req.body.external_sync_units;
        if (callbackPromiseResolve) {
          callbackPromiseResolve(receivedSyncUnits);
          // Reset the resolver after it's been called
          callbackPromiseResolve = null;
        }
      }
      
      res.status(200).send({ success: true });
    });
    
    // Start the callback server
    return new Promise<void>((resolve) => {
      callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
        console.log(`Callback server running at ${CALLBACK_SERVER_URL}`);
        resolve();
      });
    });
  });
  
  // Cleanup after tests
  afterAll(() => {
    if (callbackServer) {
      callbackServer.close();
    }
  });
  
  // Reset received data before each test
  beforeEach(() => {
    receivedSyncUnits = [];
  });
  
  // Test 1: Basic environment setup
  test('Environment variables are properly set', () => {
    for (const envVar of requiredEnvVars) {
      expect(process.env[envVar]).toBeDefined();
      expect(process.env[envVar]).not.toBe('');
    }
  });
  
  // Test 2: Server connectivity
  test('Test server is accessible', async () => {
    try {
      // Use can_invoke function to check if server is running
      const response = await axios.post(TEST_SERVER_URL, {
        execution_metadata: {
          function_name: 'can_invoke'
        },
        payload: {}
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      expect(response.data.function_result).toHaveProperty('success', true);
    } catch (error) {
      console.error('Server connectivity test failed:', error);
      throw error;
    }
  });
  
  // Test 3: Function invocation
  test('push_boards_as_sync_units function can be invoked', async () => {
    // Create a properly formatted event payload
    const eventPayload: EventPayload = {
      event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
      connection_data: {
        key: `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`,
        org_id: process.env.TRELLO_ORGANIZATION_ID,
        org_name: 'Test Organization'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        worker_data_url: WORKER_DATA_URL,
        mode: 'INITIAL'
      }
    };
    
    try {
      const response = await axios.post(TEST_SERVER_URL, {
        execution_metadata: {
          function_name: 'push_boards_as_sync_units',
          devrev_endpoint: 'http://localhost:8003'
        },
        context: {
          secrets: {
            service_account_token: 'mock-token'
          },
          snap_in_id: 'mock-snap-in-id',
          snap_in_version_id: 'mock-version-id'
        },
        input_data: {},
        payload: eventPayload
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      expect(response.data.function_result).toHaveProperty('success');
    } catch (error) {
      console.error('Function invocation test failed:', error);
      throw error;
    }
  });
  
  // Test 4: Callback server test
  test('Callback server can receive data', async () => {
    // Create a simple test payload
    const testPayload = {
      external_sync_units: [
        {
          id: 'test-id',
          name: 'Test Board',
          description: 'Test Description',
          item_type: 'cards',
          item_count: 5
        }
      ]
    };
    
    try {
      // Send test data to callback server
      const response = await axios.post(`${CALLBACK_SERVER_URL}/callback`, testPayload);
      expect(response.status).toBe(200);
      expect(receivedSyncUnits).toHaveLength(1);
      expect(receivedSyncUnits[0]).toHaveProperty('id', 'test-id');
      expect(receivedSyncUnits[0]).toHaveProperty('item_count', 5);
    } catch (error) {
      console.error('Callback server test failed:', error);
      throw error;
    }
  });
  
  // Test 5: Functional requirement test - boards have card counts
  test('push_boards_as_sync_units fetches card counts for boards', async () => {
    // Create a promise that will be resolved when callback receives data
    const callbackPromise = new Promise((resolve) => {
      callbackPromiseResolve = resolve;
    });
    
    console.log('Setting up callback promise...');
    
    // Create a properly formatted event payload with all required fields
    const eventPayload: EventPayload = {
      event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
      connection_data: {
        key: `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`,
        org_id: process.env.TRELLO_ORGANIZATION_ID,
        org_name: 'Test Organization',
        key_type: 'api_key'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/adaas-event`, // Point to our ADaaS event endpoint
        worker_data_url: WORKER_DATA_URL,
        dev_org: 'test-org',
        dev_org_id: 'test-org-id',
        dev_user: 'test-user',
        dev_user_id: 'test-user-id',
        external_sync_unit: 'test-sync-unit',
        external_sync_unit_id: 'test-sync-unit-id',
        external_sync_unit_name: 'test-sync-unit-name',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: 'test-request-id',
        snap_in_slug: 'test-snap-in',
        snap_in_version_id: 'test-version-id',
        uuid: 'test-uuid'
      }
    };
    
    try {
      console.log('Invoking push_boards_as_sync_units function...');
      
      // Invoke the function with a complete payload
      await axios.post(TEST_SERVER_URL, {
        execution_metadata: {
          function_name: 'push_boards_as_sync_units',
          devrev_endpoint: 'http://localhost:8003'
        },
        context: {
          secrets: {
            service_account_token: 'mock-token'
          },
          snap_in_id: 'mock-snap-in-id',
          snap_in_version_id: 'mock-version-id'
        },
        input_data: {},
        payload: eventPayload
      });
      
      console.log('Function invoked, waiting for callback data...');
      
      // Wait for callback to receive data (with timeout)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout waiting for callback data')), CALLBACK_TIMEOUT);
      });
      
      try {
        // Wait for either the callback data or timeout
        await Promise.race([callbackPromise, timeoutPromise]);

        console.log('Callback promise resolved!');
        
        console.log(`Received ${receivedSyncUnits.length} sync units from callback`);
        
        // Verify received data
        expect(receivedSyncUnits.length).toBeGreaterThan(0);
        
        // Check that each board has an item_count property
        for (const board of receivedSyncUnits) {
          expect(board).toHaveProperty('id');
          expect(board).toHaveProperty('name');
          expect(board).toHaveProperty('item_type', 'cards');
          expect(board).toHaveProperty('item_count');
          expect(typeof board.item_count).toBe('number');
          
          console.log(`Board "${board.name}" has ${board.item_count} cards`);
        }
      } catch (error) {
        console.log('Current receivedSyncUnits:', JSON.stringify(receivedSyncUnits, null, 2));
        console.error('Error waiting for callback data:', error);
        throw error;
      }
    } catch (error) {
      console.error('Functional requirement test failed:', error);
      throw error;
    }
  });
});