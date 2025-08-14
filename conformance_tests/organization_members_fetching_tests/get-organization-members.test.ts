import axios from 'axios';
import express from 'express';
import { Server } from 'http';

// Test configuration
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;

// Read environment variables
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

// Validate environment variables
if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
  console.error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  process.exit(1);
}

// Setup callback server
let callbackServer: Server;
const app = express();
app.use(express.json());

beforeAll(() => {
  // Start callback server
  return new Promise<void>((resolve) => {
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server started on port ${CALLBACK_SERVER_PORT}`);
      resolve();
    });
  });
});

afterAll(() => {
  // Close callback server
  return new Promise<void>((resolve) => {
    if (callbackServer) {
      callbackServer.close(() => {
        console.log('Callback server closed');
        resolve();
      });
    } else {
      resolve();
    }
  });
});

describe('Trello Snap-In: get_organization_members Function Tests', () => {
  // Test 1: Basic connectivity test
  test('should be able to connect to the Test Snap-In Server', async () => {
    try {
      // Create a simple health check event
      const event = {
        payload: {
          connection_data: {
            key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
            org_id: TRELLO_ORGANIZATION_ID
          }
        },
        context: {
          dev_oid: 'test-dev-oid',
          source_id: 'test-source-id',
          snap_in_id: 'test-snap-in-id',
          snap_in_version_id: 'test-snap-in-version-id',
          service_account_id: 'test-service-account-id',
          secrets: {
            service_account_token: 'test-token'
          }
        },
        execution_metadata: {
          request_id: 'test-request-id',
          function_name: 'health_check',
          event_type: 'test',
          devrev_endpoint: 'http://localhost:8003'
        },
        input_data: {
          global_values: {},
          event_sources: {}
        }
      };

      const response = await axios.post(SNAP_IN_SERVER_URL, event);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('function_result');
      expect(response.data.function_result).toHaveProperty('status', 'success');
    } catch (error) {
      console.error('Error connecting to Test Snap-In Server:', error);
      throw error;
    }
  });

  // Test 2: Function existence test
  test('should verify that get_organization_members function exists', async () => {
    const event = {
      payload: {
        connection_data: {
          key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
          org_id: TRELLO_ORGANIZATION_ID
        }
      },
      context: {
        dev_oid: 'test-dev-oid',
        source_id: 'test-source-id',
        snap_in_id: 'test-snap-in-id',
        snap_in_version_id: 'test-snap-in-version-id',
        service_account_id: 'test-service-account-id',
        secrets: {
          service_account_token: 'test-token'
        }
      },
      execution_metadata: {
        request_id: 'test-request-id',
        function_name: 'get_organization_members',
        event_type: 'test',
        devrev_endpoint: 'http://localhost:8003'
      },
      input_data: {
        global_values: {},
        event_sources: {}
      }
    };

    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('function_result');
    expect(response.data.error).toBeUndefined();
  });

  // Test 3: Input validation test
  test('should return error when organization ID is missing', async () => {
    const event = {
      payload: {
        connection_data: {
          key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`
          // org_id is intentionally missing
        }
      },
      context: {
        dev_oid: 'test-dev-oid',
        source_id: 'test-source-id',
        snap_in_id: 'test-snap-in-id',
        snap_in_version_id: 'test-snap-in-version-id',
        service_account_id: 'test-service-account-id',
        secrets: {
          service_account_token: 'test-token'
        }
      },
      execution_metadata: {
        request_id: 'test-request-id',
        function_name: 'get_organization_members',
        event_type: 'test',
        devrev_endpoint: 'http://localhost:8003'
      },
      input_data: {
        global_values: {},
        event_sources: {}
      }
    };

    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('function_result');
    expect(response.data.function_result).toHaveProperty('status', 'error');
    expect(response.data.function_result.message).toContain('Organization ID');
  });

  // Test 4: Success path test
  test('should successfully fetch organization members', async () => {
    const event = {
      payload: {
        connection_data: {
          key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
          org_id: TRELLO_ORGANIZATION_ID
        }
      },
      context: {
        dev_oid: 'test-dev-oid',
        source_id: 'test-source-id',
        snap_in_id: 'test-snap-in-id',
        snap_in_version_id: 'test-snap-in-version-id',
        service_account_id: 'test-service-account-id',
        secrets: {
          service_account_token: 'test-token'
        }
      },
      execution_metadata: {
        request_id: 'test-request-id',
        function_name: 'get_organization_members',
        event_type: 'test',
        devrev_endpoint: 'http://localhost:8003'
      },
      input_data: {
        global_values: {},
        event_sources: {}
      }
    };

    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('function_result');
    expect(response.data.function_result).toHaveProperty('status', 'success');
    expect(response.data.function_result).toHaveProperty('members');
    expect(Array.isArray(response.data.function_result.members)).toBe(true);
  });

  // Test 5: Response structure test
  test('should return members with the expected structure', async () => {
    const event = {
      payload: {
        connection_data: {
          key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
          org_id: TRELLO_ORGANIZATION_ID
        }
      },
      context: {
        dev_oid: 'test-dev-oid',
        source_id: 'test-source-id',
        snap_in_id: 'test-snap-in-id',
        snap_in_version_id: 'test-snap-in-version-id',
        service_account_id: 'test-service-account-id',
        secrets: {
          service_account_token: 'test-token'
        }
      },
      execution_metadata: {
        request_id: 'test-request-id',
        function_name: 'get_organization_members',
        event_type: 'test',
        devrev_endpoint: 'http://localhost:8003'
      },
      input_data: {
        global_values: {},
        event_sources: {}
      }
    };

    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    expect(response.status).toBe(200);
    expect(response.data.function_result).toHaveProperty('members');
    
    // Check that we have at least one member
    const members = response.data.function_result.members;
    expect(members.length).toBeGreaterThan(0);
    
    // Check the structure of the first member
    const firstMember = members[0];
    expect(firstMember).toHaveProperty('id');
    expect(firstMember).toHaveProperty('username');
    expect(firstMember).toHaveProperty('full_name');
    expect(typeof firstMember.id).toBe('string');
    expect(typeof firstMember.username).toBe('string');
  });
});