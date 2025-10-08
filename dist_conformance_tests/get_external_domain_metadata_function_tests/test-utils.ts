import express from 'express';
import { Server } from 'http';
import axios from 'axios';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
  CHEF_CLI_PATH: string;
}

export interface CallbackServer {
  server: Server;
  port: number;
  close: () => Promise<void>;
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
    .map(([key, _]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return env as TestEnvironment;
}

export function createTestEvent(env: TestEnvironment): any {
  return {
    context: {
      dev_oid: "test-dev-oid",
      source_id: "test-source-id",
      snap_in_id: "test-snap-in-id",
      snap_in_version_id: "test-snap-in-version-id",
      service_account_id: "test-service-account-id",
      secrets: {
        service_account_token: "test-token"
      }
    },
    payload: {
      connection_data: {
        org_id: env.TRELLO_ORGANIZATION_ID,
        org_name: "Test Organization",
        key: `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`,
        key_type: "oauth"
      },
      event_context: {
        callback_url: "http://localhost:8002/callback",
        dev_org: "test-dev-org",
        dev_org_id: "test-dev-org-id",
        dev_user: "test-dev-user",
        dev_user_id: "test-dev-user-id",
        external_sync_unit: "test-external-sync-unit",
        external_sync_unit_id: "688725dad59c015ce052eecf",
        external_sync_unit_name: "Test External Sync Unit",
        external_system: "trello",
        external_system_type: "trello",
        import_slug: "test-import-slug",
        mode: "INITIAL",
        request_id: "test-request-id",
        snap_in_slug: "test-snap-in-slug",
        snap_in_version_id: "test-snap-in-version-id",
        sync_run: "test-sync-run",
        sync_run_id: "test-sync-run-id",
        sync_tier: "test-sync-tier",
        sync_unit: "test-sync-unit",
        sync_unit_id: "test-sync-unit-id",
        uuid: "test-uuid",
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_type: "TEST_EVENT",
      event_data: {}
    },
    execution_metadata: {
      request_id: "test-request-id",
      function_name: "get_external_domain_metadata",
      event_type: "test",
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

export async function setupCallbackServer(): Promise<CallbackServer> {
  const app = express();
  app.use(express.json());
  
  app.post('/callback', (req, res) => {
    console.log('Callback received:', req.body);
    res.status(200).json({ received: true });
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(8002, (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          server,
          port: 8002,
          close: () => new Promise((resolveClose) => {
            server.close(() => resolveClose());
          })
        });
      }
    });
  });
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

  return response.data;
}