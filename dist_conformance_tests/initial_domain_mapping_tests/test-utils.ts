import axios from 'axios';
import * as http from 'http';

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

  for (const [key, value] of Object.entries(env)) {
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return env as TestEnvironment;
}

export function createBaseTestEvent(functionName: string, env: TestEnvironment): any {
  return {
    payload: {
      connection_data: {
        key: `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`,
        org_id: env.TRELLO_ORGANIZATION_ID,
        org_name: "Test Organization",
        key_type: "oauth"
      },
      event_context: {
        callback_url: "http://localhost:8002/callback",
        dev_org: "test-dev-org",
        dev_org_id: "test-dev-org-id",
        dev_user: "test-dev-user",
        dev_user_id: "test-dev-user-id",
        external_sync_unit: "test-sync-unit",
        external_sync_unit_id: "68e8befbf2f641caa9b1e275",
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
        sync_unit: "test-sync-unit",
        sync_unit_id: "test-sync-unit-id",
        uuid: "test-uuid",
        worker_data_url: "http://localhost:8003/external-worker"
      }
    },
    context: {
      dev_oid: "test-dev-org-id",
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
      function_name: functionName,
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
  private server: http.Server | null = null;
  private port = 8002;

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
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

export async function callSnapInFunction(functionName: string, event: any): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', event, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  return response.data;
}