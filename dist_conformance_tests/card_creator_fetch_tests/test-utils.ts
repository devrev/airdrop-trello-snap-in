import express from 'express';
import axios from 'axios';
import { Server } from 'http';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
}

export interface CallbackServerSetup {
  server: Server;
  port: number;
  receivedEvents: any[];
  cleanup: () => Promise<void>;
}

export function getTestEnvironment(): TestEnvironment {
  const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
  const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
  const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

  if (!TRELLO_API_KEY) {
    throw new Error('TRELLO_API_KEY environment variable is required');
  }
  if (!TRELLO_TOKEN) {
    throw new Error('TRELLO_TOKEN environment variable is required');
  }
  if (!TRELLO_ORGANIZATION_ID) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is required');
  }

  return {
    TRELLO_API_KEY,
    TRELLO_TOKEN,
    TRELLO_ORGANIZATION_ID
  };
}

export async function setupCallbackServer(): Promise<CallbackServerSetup> {
  const app = express();
  app.use(express.json());
  
  const receivedEvents: any[] = [];
  
  app.post('/callback', (req, res) => {
    receivedEvents.push({
      timestamp: new Date().toISOString(),
      body: req.body,
      headers: req.headers
    });
    res.status(200).json({ status: 'received' });
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(8002, (err?: Error) => {
      if (err) {
        reject(new Error(`Failed to start callback server: ${err.message}`));
        return;
      }
      
      resolve({
        server,
        port: 8002,
        receivedEvents,
        cleanup: async () => {
          return new Promise<void>((resolveCleanup) => {
            server.close(() => resolveCleanup());
          });
        }
      });
    });
  });
}

export function createBaseTestEvent(env: TestEnvironment): any {
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
        external_sync_unit: "68e8befbf2f641caa9b1e275",
        external_sync_unit_id: "68e8befbf2f641caa9b1e275",
        external_sync_unit_name: "Test Board",
        external_system: "trello",
        external_system_type: "trello",
        import_slug: "test-import",
        mode: "INITIAL",
        request_id: "test-request-id",
        snap_in_slug: "trello-snap-in",
        snap_in_version_id: "v1.0.0",
        sync_run: "test-sync-run",
        sync_run_id: "test-sync-run-id",
        sync_tier: "standard",
        sync_unit: "test-sync-unit",
        sync_unit_id: "test-sync-unit-id",
        uuid: "test-uuid",
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_type: "test_event",
      event_data: {}
    },
    context: {
      dev_oid: "test-dev-oid",
      source_id: "test-source-id",
      snap_in_id: "test-snap-in-id",
      snap_in_version_id: "v1.0.0",
      service_account_id: "test-service-account-id",
      secrets: {
        service_account_token: "test-token"
      }
    },
    execution_metadata: {
      request_id: "test-request-id",
      function_name: "fetch_created_by",
      event_type: "function_invocation",
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

export async function callSnapInFunction(functionName: string, event: any): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', {
    ...event,
    execution_metadata: {
      ...event.execution_metadata,
      function_name: functionName
    }
  });
  return response.data;
}