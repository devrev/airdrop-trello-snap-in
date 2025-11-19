import express, { Express } from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';
import axios from 'axios';

export interface TestCredentials {
  apiKey: string;
  token: string;
  organizationId: string;
}

export function getCredentialsFromEnv(): TestCredentials {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const organizationId = process.env.TRELLO_ORGANIZATION_ID;

  if (!apiKey || !token || !organizationId) {
    throw new Error(
      'Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, or TRELLO_ORGANIZATION_ID'
    );
  }

  return {
    apiKey,
    token,
    organizationId,
  };
}

export function createConnectionDataKey(credentials: TestCredentials): string {
  return `key=${credentials.apiKey}&token=${credentials.token}`;
}

export function createFetchUsersEventPayload(credentials: TestCredentials): any {
  return {
    payload: {
      connection_data: {
        key: createConnectionDataKey(credentials),
        org_id: credentials.organizationId,
        org_name: 'Test Organization',
        key_type: 'oauth',
      },
    },
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token',
      },
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: 'fetch_users',
      event_type: 'test-event',
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
  };
}

export interface CallbackServerSetup {
  app: Express;
  server: Server;
  receivedCallbacks: any[];
}

export function setupCallbackServer(port: number = 8002): Promise<CallbackServerSetup> {
  return new Promise((resolve) => {
    const app = express();
    app.use(bodyParser.json());

    const receivedCallbacks: any[] = [];

    app.post('*', (req, res) => {
      receivedCallbacks.push({
        path: req.path,
        body: req.body,
        headers: req.headers,
      });
      res.status(200).send({ success: true });
    });

    const server = app.listen(port, () => {
      resolve({ app, server, receivedCallbacks });
    });
  });
}

export function teardownCallbackServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export async function invokeSnapInFunction(
  functionName: string,
  eventPayload: any
): Promise<any> {
  const snapInServerUrl = 'http://localhost:8000/handle/sync';

  try {
    const response = await axios.post(snapInServerUrl, eventPayload, {
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true, // Accept all status codes
    });

    return {
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to invoke snap-in function: ${error.message}. ${
          error.response?.data ? JSON.stringify(error.response.data) : ''
        }`
      );
    }
    throw error;
  }
}

/**
 * Trigger rate limiting on the test server
 * @param testName - Identifier for the test triggering rate limiting
 */
export async function triggerRateLimiting(testName: string): Promise<void> {
  const rateLimitingUrl = 'http://localhost:8004/start_rate_limiting';

  try {
    const response = await axios.post(
      rateLimitingUrl,
      { test_name: testName },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to trigger rate limiting: ${error.message}. ${
          error.response?.data ? JSON.stringify(error.response.data) : ''
        }`
      );
    }
    throw error;
  }
}