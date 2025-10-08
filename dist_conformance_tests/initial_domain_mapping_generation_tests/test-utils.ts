import axios from 'axios';
import { createServer, Server } from 'http';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
  CHEF_CLI_PATH: string;
}

export function getTestEnvironment(): TestEnvironment {
  const env = {
    TRELLO_API_KEY: process.env.TRELLO_API_KEY,
    TRELLO_TOKEN: process.env.TRELLO_TOKEN,
    TRELLO_ORGANIZATION_ID: process.env.TRELLO_ORGANIZATION_ID,
    CHEF_CLI_PATH: process.env.CHEF_CLI_PATH,
  };

  const missing = Object.entries(env)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return env as TestEnvironment;
}

export function createBaseEvent(env: TestEnvironment): any {
  return {
    payload: {
      connection_data: {
        org_id: env.TRELLO_ORGANIZATION_ID,
        org_name: "Test Organization",
        key: `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`,
        key_type: "oauth"
      },
      event_context: {
        callback_url: "http://localhost:8002/callback",
        dev_org: "test-org",
        dev_org_id: "test-org-id",
        dev_user: "test-user",
        dev_user_id: "test-user-id",
        external_sync_unit: "test-unit",
        external_sync_unit_id: "688725dad59c015ce052eecf",
        external_sync_unit_name: "Test Board",
        external_system: "trello",
        external_system_type: "trello",
        import_slug: "test-import",
        mode: "INITIAL",
        request_id: "test-request-id",
        snap_in_slug: "trello-snap-in",
        snap_in_version_id: "test-version-id",
        sync_run: "test-sync-run",
        sync_run_id: "test-sync-run-id",
        sync_tier: "test-tier",
        sync_unit: "test-unit",
        sync_unit_id: "test-unit-id",
        uuid: "test-uuid",
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_type: "test_event"
    },
    context: {
      dev_oid: "test-org-id",
      source_id: "test-source-id",
      snap_in_id: "test-snap-in-id",
      snap_in_version_id: "test-version-id",
      service_account_id: "test-service-account-id",
      secrets: {
        service_account_token: "test-token"
      }
    },
    execution_metadata: {
      request_id: "test-request-id",
      function_name: "get_initial_domain_mapping",
      event_type: "test_event",
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

export class CallbackServer {
  private server: Server | null = null;
  private port = 8002;

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
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
        this.server.closeAllConnections?.();
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export async function callSnapInFunction(functionName: string, event: any): Promise<any> {
  const eventWithFunction = {
    ...event,
    execution_metadata: {
      ...event.execution_metadata,
      function_name: functionName
    }
  };

  const response = await axios.post('http://localhost:8000/handle/sync', eventWithFunction, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  const result = response.data;
  
  // Clean up axios connection
  if (response.request?.destroy) {
    response.request.destroy();
  }
  
  return result;
}