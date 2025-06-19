import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import bodyParser from 'body-parser';

// Test configuration
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;

// Interface for the Snap-In response
interface SnapInResponse {
  function_result?: {
    success: boolean;
    message: string;
    users?: any[];
    error?: any;
  };
  error?: any;
}

describe('Trello Snap-In Fetch Users Tests', () => {
  let callbackServer: Server;
  let callbackData: any = null;

  // Set up callback server before tests
  beforeAll((done) => {
    const app = express();
    app.use(bodyParser.json());
    
    // Endpoint to receive callback data
    app.post('/callback', (req, res) => {
      callbackData = req.body;
      res.status(200).send({ status: 'received' });
    });
    
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server running on port ${CALLBACK_SERVER_PORT}`);
      done();
    });
  });

  // Clean up after tests
  afterAll((done) => {
    callbackServer.close(done);
  });

  // Test 1: Verify environment variables
  test('Environment variables are properly set', () => {
    expect(process.env.TRELLO_API_KEY).toBeDefined();
    expect(process.env.TRELLO_TOKEN).toBeDefined();
    expect(process.env.TRELLO_ORGANIZATION_ID).toBeDefined();
    
    if (!process.env.TRELLO_API_KEY || !process.env.TRELLO_TOKEN || !process.env.TRELLO_ORGANIZATION_ID) {
      throw new Error('Required environment variables are not set');
    }
  });

  // Test 2: Test basic connectivity - can_invoke function
  test('Snap-In can be invoked', async () => {
    const response = await axios.post(TEST_SERVER_URL, {
      execution_metadata: {
        function_name: 'can_invoke'
      },
      payload: {},
      context: {}
    });

    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.success).toBe(true);
  });

  // Test 3: Test authentication with Trello API
  test('Snap-In can authenticate with Trello API', async () => {
    const response = await axios.post(TEST_SERVER_URL, {
      execution_metadata: {
        function_name: 'check_auth'
      },
      payload: {
        connection_data: {
          key: `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`
        }
      },
      context: {}
    });

    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.authenticated).toBe(true);
  });

  // Test 4: Test fetch_users function with valid inputs
  test('fetch_users function returns users from organization', async () => {
    const response = await axios.post<SnapInResponse>(TEST_SERVER_URL, {
      execution_metadata: {
        function_name: 'fetch_users'
      },
      payload: {
        connection_data: {
          key: `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`,
          org_id: process.env.TRELLO_ORGANIZATION_ID
        }
      },
      context: {}
    });

    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result?.success).toBe(true);
    expect(response.data.function_result?.users).toBeDefined();
    expect(Array.isArray(response.data.function_result?.users)).toBe(true);
    
    // Check user structure if users are returned
    if (response.data.function_result?.users && response.data.function_result.users.length > 0) {
      const user = response.data.function_result.users[0];
      expect(user.id).toBeDefined();
      expect(user.username).toBeDefined();
      expect(user.full_name).toBeDefined();
    }
  });

  // Test 5: Test fetch_users function with missing organization ID
  test('fetch_users function handles missing organization ID', async () => {
    const response = await axios.post<SnapInResponse>(TEST_SERVER_URL, {
      execution_metadata: {
        function_name: 'fetch_users'
      },
      payload: {
        connection_data: {
          key: `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`
          // org_id is intentionally omitted
        }
      },
      context: {}
    });

    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result?.success).toBe(false);
    expect(response.data.function_result?.message).toContain('Missing organization ID');
  });

  // Test 6: Test fetch_users function with invalid credentials
  test('fetch_users function handles invalid credentials', async () => {
    const response = await axios.post<SnapInResponse>(TEST_SERVER_URL, {
      execution_metadata: {
        function_name: 'fetch_users'
      },
      payload: {
        connection_data: {
          key: 'key=invalid_key&token=invalid_token',
          org_id: process.env.TRELLO_ORGANIZATION_ID
        }
      },
      context: {}
    });

    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result?.success).toBe(false);
  });

  // Test 7: Test fetch_users function with invalid organization ID
  test('fetch_users function handles invalid organization ID', async () => {
    const response = await axios.post<SnapInResponse>(TEST_SERVER_URL, {
      execution_metadata: {
        function_name: 'fetch_users'
      },
      payload: {
        connection_data: {
          key: `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`,
          org_id: 'invalid_org_id'
        }
      },
      context: {}
    });

    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result?.success).toBe(false);
  });
});