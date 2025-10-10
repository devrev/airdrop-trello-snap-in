import axios from 'axios';
import * as http from 'http';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
}

export function getTestEnvironment(): TestEnvironment {
  const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
  const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
  const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

  if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
    throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  }

  return {
    TRELLO_API_KEY,
    TRELLO_TOKEN,
    TRELLO_ORGANIZATION_ID
  };
}

export function createCallbackServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'received' }));
    });

    server.listen(8002, () => {
      resolve(server);
    });
  });
}

export function createBaseTestEvent(env: TestEnvironment, globalValues: Record<string, string> = {}): any {
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
        external_system_type: "project_management",
        import_slug: "test-import",
        mode: "INITIAL",
        request_id: "test-request-123",
        snap_in_slug: "trello-snap-in",
        snap_in_version_id: "v1.0.0",
        sync_run: "sync-run-123",
        sync_run_id: "sync-run-123",
        sync_tier: "standard",
        sync_unit: "test-unit",
        sync_unit_id: "test-unit-id",
        uuid: "test-uuid-123",
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_type: "EXTRACTION_DATA_START",
      event_data: {}
    },
    context: {
      dev_oid: "test-org-id",
      source_id: "test-source",
      snap_in_id: "test-snap-in",
      snap_in_version_id: "v1.0.0",
      service_account_id: "test-service-account",
      secrets: {
        service_account_token: "test-token"
      }
    },
    execution_metadata: {
      request_id: "test-request-123",
      function_name: "download_attachment",
      event_type: "function_invocation",
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: globalValues,
      event_sources: {}
    }
  };
}

export async function callSnapInFunction(event: any): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', event, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  return response.data;
}