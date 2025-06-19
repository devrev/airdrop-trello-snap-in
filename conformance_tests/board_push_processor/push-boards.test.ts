import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Environment variables check
const requiredEnvVars = [
  'TRELLO_API_KEY',
  'TRELLO_TOKEN',
  'TRELLO_ORGANIZATION_ID'
];

// Interface for external sync unit
interface ExternalSyncUnit {
  id: string;
  name: string;
  description: string;
  item_type: string;
  item_count: number;
}

describe('Push Boards as Sync Units Function Tests', () => {
  let callbackServer: Server;
  let receivedSyncUnits: ExternalSyncUnit[] = [];
  
  // Setup callback server before tests
  beforeAll(async () => {
    // Check for required environment variables
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
      }
    }
    
    // Setup callback server to receive sync units
    const app = express();
    app.use(bodyParser.json());
    
    app.post('/callback', (req, res) => {
      console.log('Callback server received data:', JSON.stringify(req.body, null, 2));
      if (req.body && 
          req.body.event_type === 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE' && 
          req.body.event_data && req.body.event_data.external_sync_units) {
        receivedSyncUnits = req.body.event_data.external_sync_units;
      }
      res.status(200).send({ success: true });
    });
    
    return new Promise<void>((resolve) => {
      callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
        console.log(`Callback server started on port ${CALLBACK_SERVER_PORT}`);
        resolve();
      });
    });
  });
  
  // Cleanup after tests
  afterAll(async () => {
    if (callbackServer) {
      return new Promise<void>((resolve) => {
        callbackServer.close(() => {
          console.log('Callback server closed');
          resolve();
        });
      });
    }
  });
  
  // Test 1: Basic environment setup
  test('Environment variables are properly set', () => {
    for (const envVar of requiredEnvVars) {
      expect(process.env[envVar]).toBeDefined();
      expect(process.env[envVar]?.length).toBeGreaterThan(0);
    }
  });
  
  // Test 2: Server connectivity
  test('Can connect to the Test Snap-In Server', async () => {
    try {
      // Simple ping with minimal payload to check connectivity
      const response = await axios.post(`${SNAP_IN_SERVER_URL}`, {
        execution_metadata: {
          function_name: 'can_invoke'
        },
        payload: {}
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    } catch (error) {
      console.error('Error connecting to Test Snap-In Server:', error);
      throw error;
    }
  });
  
  // Test 3: Function invocation
  test('Can invoke push_boards_as_sync_units function', async () => {
    try {
      const response = await axios.post(`${SNAP_IN_SERVER_URL}`, {
        execution_metadata: {
          function_name: 'push_boards_as_sync_units',
          devrev_endpoint: 'http://localhost:8003'
        },
        context: {
          secrets: {
            service_account_token: 'test-token'
          }
        },
        payload: {
          event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
          connection_data: {
            key: `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`,
            org_id: process.env.TRELLO_ORGANIZATION_ID
          },
          event_context: {
            callback_url: `${CALLBACK_SERVER_URL}/callback`
          }
        }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.success).toBe(true);
      
      // Wait for callback server to receive data (if any)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error('Error invoking push_boards_as_sync_units function:', error);
      throw error;
    }
  });
  
  // Test 4: Full function execution with validation
  test('Successfully pushes boards as sync units', async () => {
    try {
      // Reset received sync units
      receivedSyncUnits = [];
      
      // Create a proper event payload for the function
      const response = await axios.post(`${SNAP_IN_SERVER_URL}`, {
        execution_metadata: {
          function_name: 'push_boards_as_sync_units',
          devrev_endpoint: 'http://localhost:8003'
        },
        context: {
          secrets: {
            service_account_token: 'test-token'
          }
        },
        payload: {
          event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
          connection_data: {
            key: `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`,
            org_id: process.env.TRELLO_ORGANIZATION_ID
          },
          event_context: {
            callback_url: `${CALLBACK_SERVER_URL}/callback`
          }
        }
      });
      
      // Validate response
      expect(response.status).toBe(200);
      expect(response.data.function_result).toBeDefined();
      expect(response.data.function_result.success).toBe(true);
      expect(response.data.function_result.message).toContain('Successfully pushed boards');
      
      // Wait for callback to receive data
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Validate received sync units (if any)
      // Note: We can't guarantee boards exist, but if they do, they should have the right format
      if (receivedSyncUnits.length > 0) {
        for (const syncUnit of receivedSyncUnits) {
          expect(syncUnit).toHaveProperty('id');
          expect(syncUnit).toHaveProperty('name');
          expect(syncUnit).toHaveProperty('description');
          expect(syncUnit).toHaveProperty('item_type');
          expect(syncUnit.item_type).toBe('cards');
        }
      }
      
      console.log(`Received ${receivedSyncUnits.length} sync units`);
      
    } catch (error) {
      console.error('Error in full function execution test:', error);
      throw error;
    }
  });
});