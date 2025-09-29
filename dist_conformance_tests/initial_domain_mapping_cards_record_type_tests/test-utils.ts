import axios from 'axios';
import { createServer, Server } from 'http';

export interface TestCredentials {
  trelloApiKey: string;
  trelloToken: string;
  trelloOrganizationId: string;
}

export interface CallbackServerSetup {
  server: Server;
  port: number;
  callbackUrl: string;
}

export function getTestCredentials(): TestCredentials {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrganizationId = process.env.TRELLO_ORGANIZATION_ID;

  if (!trelloApiKey) {
    throw new Error('TRELLO_API_KEY environment variable is required');
  }
  if (!trelloToken) {
    throw new Error('TRELLO_TOKEN environment variable is required');
  }
  if (!trelloOrganizationId) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is required');
  }

  return {
    trelloApiKey,
    trelloToken,
    trelloOrganizationId,
  };
}

export function setupCallbackServer(): Promise<CallbackServerSetup> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
    });

    server.listen(8002, (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          server,
          port: 8002,
          callbackUrl: 'http://localhost:8002',
        });
      }
    });
  });
}

export function createTestEvent(functionName: string, credentials: TestCredentials, additionalPayload: any = {}): any {
  return {
    context: {
      dev_oid: 'test-dev-org',
      source_id: 'test-source',
      snap_in_id: 'test-snap-in',
      snap_in_version_id: 'test-version',
      service_account_id: 'test-service-account',
      secrets: {
        service_account_token: 'test-token',
      },
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: functionName,
      event_type: 'test-event',
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
    payload: {
      connection_data: {
        key: `key=${credentials.trelloApiKey}&token=${credentials.trelloToken}`,
        org_id: credentials.trelloOrganizationId,
      },
      event_context: {
        external_sync_unit_id: '688725dad59c015ce052eecf',
      },
      ...additionalPayload,
    },
  };
}

export async function callSnapInFunction(event: any): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', event, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}