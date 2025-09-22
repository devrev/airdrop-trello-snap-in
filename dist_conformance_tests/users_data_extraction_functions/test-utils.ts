import axios from 'axios';
import * as http from 'http';

export interface TestEnvironment {
  trelloApiKey: string;
  trelloToken: string;
  trelloOrganizationId: string;
}

export interface CallbackData {
  method: string;
  url: string;
  headers: any;
  body: any;
}

export class CallbackServer {
  private server: http.Server;
  private receivedCallbacks: CallbackData[] = [];
  private port: number = 8002;

  constructor() {
    this.server = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        this.receivedCallbacks.push({
          method: req.method || 'GET',
          url: req.url || '',
          headers: req.headers,
          body: body ? JSON.parse(body) : null
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'received' }));
      });
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        resolve();
      });
    });
  }

  getCallbacks(): CallbackData[] {
    return [...this.receivedCallbacks];
  }

  clearCallbacks(): void {
    this.receivedCallbacks = [];
  }
}

export function getTestEnvironment(): TestEnvironment {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrganizationId = process.env.TRELLO_ORGANIZATION_ID;

  if (!trelloApiKey || !trelloToken || !trelloOrganizationId) {
    throw new Error(
      'Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID'
    );
  }

  return {
    trelloApiKey,
    trelloToken,
    trelloOrganizationId
  };
}

export function createBaseEvent(eventType: string, env: TestEnvironment) {
  return {
    context: {
      dev_oid: "test-dev-oid",
      source_id: "test-source-id",
      snap_in_id: "test-snap-in-id",
      snap_in_version_id: "test-snap-in-version-id",
      service_account_id: "test-service-account-id",
      secrets: {
        service_account_token: "test-service-account-token"
      }
    },
    payload: {
      connection_data: {
        org_id: env.trelloOrganizationId,
        org_name: "Test Organization",
        key: `key=${env.trelloApiKey}&token=${env.trelloToken}`,
        key_type: "oauth"
      },
      event_context: {
        callback_url: "http://localhost:8002/callback",
        dev_org: "test-dev-org",
        dev_org_id: "test-dev-org-id",
        dev_user: "test-dev-user",
        dev_user_id: "test-dev-user-id",
        external_sync_unit: "688725dad59c015ce052eecf",
        external_sync_unit_id: "688725dad59c015ce052eecf",
        external_sync_unit_name: "Test Board",
        external_system: "trello",
        external_system_type: "trello",
        import_slug: "test-import-slug",
        mode: "INITIAL",
        request_id: "test-request-id",
        snap_in_slug: "trello-snap-in",
        snap_in_version_id: "test-snap-in-version-id",
        sync_run: "test-sync-run",
        sync_run_id: "test-sync-run-id",
        sync_tier: "test-sync-tier",
        sync_unit: "test-sync-unit",
        sync_unit_id: "test-sync-unit-id",
        uuid: "test-uuid",
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_type: eventType,
      event_data: {}
    },
    execution_metadata: {
      request_id: "test-request-id",
      function_name: "extraction",
      event_type: eventType,
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

export async function sendEventToSnapIn(event: any): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', event, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  return response.data;
}