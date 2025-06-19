import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import bodyParser from 'body-parser';

// Environment variables
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

// Check if required environment variables are set
if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
  console.error('Required environment variables are not set. Please set TRELLO_API_KEY, TRELLO_TOKEN, and TRELLO_ORGANIZATION_ID.');
  process.exit(1);
}

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Setup callback server
let callbackServer: Server;
let receivedMetadata: any = null;
let callbackPromiseResolve: ((value: unknown) => void) | null = null;
let callbackPromise: Promise<unknown> | null = null;

beforeAll(async () => {
  // Create a simple Express server to receive callbacks
  const app = express();
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

  // Endpoint to receive the metadata
  app.post('/callback', (req, res) => {
    receivedMetadata = req.body;
    res.status(200).send({ success: true });
  });
  
  // Start the callback server
  return new Promise<void>((resolve) => {
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server is running at ${CALLBACK_SERVER_URL}`);
      resolve();
    });
  });
});

afterAll(async () => {
  // Close the callback server
  if (callbackServer) {
    return new Promise<void>((resolve) => {
      callbackServer.close(() => {
        if (callbackPromiseResolve) callbackPromiseResolve(null);
        console.log('Callback server closed');
        resolve();
      });
    });
  }
});

// Helper function to create a promise that will be resolved when the callback is received
function createCallbackPromise(): Promise<unknown> {
  callbackPromise = new Promise((resolve) => {
    callbackPromiseResolve = resolve;
  });
  return callbackPromise;
}

describe('Metadata Extraction Conformance Tests', () => {
  // Test 1: Basic - Verify that the extraction_metadata function exists and can be invoked
  test('extraction_metadata function exists and can be invoked', async () => {
    const response = await axios.post(SNAP_IN_SERVER_URL, {
      execution_metadata: {
        function_name: 'extraction_metadata',
        devrev_endpoint: 'http://localhost:8003'
      },
      payload: { 
        event_type: 'EXTRACTION_METADATA_START',
        connection_data: {
          key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
          org_id: TRELLO_ORGANIZATION_ID
        },
        event_context: {
          callback_url: `${CALLBACK_SERVER_URL}/callback`
        }
      },
      context: {
        secrets: {
          service_account_token: 'test-token'
        }
      }
    });

    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
    expect(response.data.function_result.message).toContain('Metadata extraction completed successfully');
  }, 30000);

  // Test 2: Intermediate - Verify that the function properly handles the extraction metadata event
  test('extraction_metadata function handles extraction metadata event correctly', async () => {
    const response = await axios.post(SNAP_IN_SERVER_URL, {
      execution_metadata: {
        function_name: 'extraction_metadata',
        devrev_endpoint: 'http://localhost:8003'
      },
      payload: {
        event_type: 'EXTRACTION_METADATA_START',
        connection_data: {
          key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
          org_id: TRELLO_ORGANIZATION_ID
        },
        event_context: {
          callback_url: `${CALLBACK_SERVER_URL}/callback`
        }
      },
      context: {
        secrets: {
          service_account_token: 'test-token'
        }
      }
    });

    expect(response.status).toBe(200);
    expect(response.data.function_result.success).toBe(true);
    
    // Verify that the worker was spawned correctly 
    expect(response.data.function_result.message).not.toContain('Worker file not found');
    expect(response.data.function_result.message).not.toContain('Error during metadata extraction');
  }, 30000);

  // Test 3: Advanced - Verify that the function correctly generates and pushes the External Domain Metadata
  test('extraction_metadata function generates correct metadata schema', async () => {
    // First, get the metadata schema from the generate_domain_metadata function
    const metadataResponse = await axios.post(SNAP_IN_SERVER_URL, {
      execution_metadata: {
        function_name: 'generate_domain_metadata',
        devrev_endpoint: 'http://localhost:8003'
      },
      payload: {},
      context: {}
    });

    expect(metadataResponse.status).toBe(200);
    expect(metadataResponse.data.function_result.success).toBe(true);
    expect(metadataResponse.data.function_result.metadata).toBeDefined();
    
    const expectedMetadata = metadataResponse.data.function_result.metadata;
    
    // Verify the structure of the metadata
    expect(expectedMetadata.schema_version).toBe('v0.2.0');
    expect(expectedMetadata.record_types).toBeDefined();
    expect(expectedMetadata.record_types.cards).toBeDefined();
    expect(expectedMetadata.record_types.users).toBeDefined();
    
    // Verify that cards record type has the expected fields
    const cardsType = expectedMetadata.record_types.cards;
    expect(cardsType.name).toBe('Trello Cards');
    expect(cardsType.fields.id).toBeDefined();
    expect(cardsType.fields.name).toBeDefined();
    expect(cardsType.fields.description).toBeDefined();
    
    // Verify that users record type has the expected fields
    const usersType = expectedMetadata.record_types.users;
    expect(usersType.name).toBe('Trello Users');
    expect(usersType.fields.id).toBeDefined();
    expect(usersType.fields.username).toBeDefined();
    expect(usersType.fields.email).toBeDefined();
  }, 30000);
});