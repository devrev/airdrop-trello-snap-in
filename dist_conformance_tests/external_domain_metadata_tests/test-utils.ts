import axios from 'axios';
import { createServer, Server } from 'http';

export interface TestCredentials {
  trelloApiKey: string;
  trelloToken: string;
  trelloOrganizationId: string;
  chefCliPath: string;
}

export interface TestEvent {
  payload: {
    connection_data: {
      key: string;
      org_id: string;
    };
    event_type: string;
    event_context: {
      external_sync_unit_id: string;
    };
  };
  context: {
    dev_oid: string;
    snap_in_id: string;
    snap_in_version_id: string;
    service_account_id: string;
    secrets: {
      service_account_token: string;
    };
  };
  execution_metadata: {
    request_id: string;
    function_name: string;
    event_type: string;
    devrev_endpoint: string;
  };
  input_data: {
    global_values: Record<string, string>;
    event_sources: Record<string, string>;
  };
}

export function getTestCredentials(): TestCredentials {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrganizationId = process.env.TRELLO_ORGANIZATION_ID;
  const chefCliPath = process.env.CHEF_CLI_PATH;

  if (!trelloApiKey) {
    throw new Error('TRELLO_API_KEY environment variable is required');
  }
  if (!trelloToken) {
    throw new Error('TRELLO_TOKEN environment variable is required');
  }
  if (!trelloOrganizationId) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is required');
  }
  if (!chefCliPath) {
    throw new Error('CHEF_CLI_PATH environment variable is required');
  }

  return {
    trelloApiKey,
    trelloToken,
    trelloOrganizationId,
    chefCliPath,
  };
}

export function createTestEvent(credentials: TestCredentials, functionName: string): TestEvent {
  const connectionKey = `key=${credentials.trelloApiKey}&token=${credentials.trelloToken}`;
  
  return {
    payload: {
      connection_data: {
        key: connectionKey,
        org_id: credentials.trelloOrganizationId,
      },
      event_type: 'test_event',
      event_context: {
        external_sync_unit_id: '68e8befbf2f641caa9b1e275',
      },
    },
    context: {
      dev_oid: 'test-dev-org',
      snap_in_id: 'test-snap-in',
      snap_in_version_id: 'test-version',
      service_account_id: 'test-service-account',
      secrets: {
        service_account_token: 'test-token',
      },
    },
    execution_metadata: {
      request_id: `test-request-${Date.now()}`,
      function_name: functionName,
      event_type: 'test_event',
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
  };
}

export class CallbackServer {
  private server: Server | null = null;
  private port = 8002;

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'received' }));
      });

      this.server.listen(this.port, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export async function callSnapInFunction(event: TestEvent): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', event, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  return response.data;
}