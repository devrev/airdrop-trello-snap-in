import express, { Express } from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import { Server } from 'http';

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

export function createFetchBoardsEvent(credentials: TestCredentials): any {
  return {
    execution_metadata: {
      request_id: `test-request-${Date.now()}`,
      function_name: 'fetch_boards',
      event_type: 'test:fetch_boards',
      devrev_endpoint: 'http://localhost:8003',
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
    payload: {
      connection_data: {
        key: createConnectionDataKey(credentials),
        org_id: credentials.organizationId,
        org_name: 'Test Organization',
        key_type: 'oauth',
      },
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
  port: number;
  receivedCallbacks: any[];
}

export async function setupCallbackServer(port: number = 8002): Promise<CallbackServerSetup> {
  const app: Express = express();
  app.use(bodyParser.json());

  const receivedCallbacks: any[] = [];

  app.post('/callback', (req, res) => {
    receivedCallbacks.push(req.body);
    res.status(200).send({ success: true });
  });

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(port, () => {
      resolve(s);
    });
  });

  return {
    app,
    server,
    port,
    receivedCallbacks,
  };
}

export async function teardownCallbackServer(setup: CallbackServerSetup): Promise<void> {
  return new Promise((resolve, reject) => {
    setup.server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export async function sendEventToSnapIn(event: any): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', event, {
    headers: {
      'Content-Type': 'application/json',
    },
    validateStatus: () => true, // Accept any status code
  });

  return response;
}