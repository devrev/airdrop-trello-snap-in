import axios from 'axios';
import * as http from 'http';

export interface TestEnvironment {
  trelloApiKey: string;
  trelloToken: string;
  trelloOrgId: string;
}

export interface CallbackServerSetup {
  server: http.Server;
  port: number;
  receivedRequests: any[];
}

export function getTestEnvironment(): TestEnvironment {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!trelloApiKey || !trelloToken || !trelloOrgId) {
    throw new Error(
      'Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID'
    );
  }

  return {
    trelloApiKey,
    trelloToken,
    trelloOrgId,
  };
}

export function createTestEvent(functionName: string, env: TestEnvironment, additionalPayload: any = {}): any {
  const connectionKey = `key=${env.trelloApiKey}&token=${env.trelloToken}`;
  
  return {
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-service-account-token',
      },
    },
    payload: {
      connection_data: {
        org_id: env.trelloOrgId,
        org_name: 'Test Organization',
        key: connectionKey,
        key_type: 'oauth',
      },
      event_context: {
        callback_url: 'http://localhost:8002/callback',
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-dev-user',
        dev_user_id: 'test-dev-user-id',
        external_sync_unit: '688725dad59c015ce052eecf',
        external_sync_unit_id: '688725dad59c015ce052eecf',
        external_sync_unit_name: 'Test Board',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'test-import-slug',
        mode: 'INITIAL',
        request_id: 'test-request-id',
        snap_in_slug: 'trello-snap-in',
        snap_in_version_id: 'test-snap-in-version-id',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'test-sync-tier',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'http://localhost:8003/external-worker',
      },
      ...additionalPayload,
    },
    execution_metadata: {
      request_id: 'test-request-id',
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

export async function setupCallbackServer(): Promise<CallbackServerSetup> {
  const receivedRequests: any[] = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const parsedBody = JSON.parse(body);
        receivedRequests.push(parsedBody);
      } catch (e) {
        receivedRequests.push({ raw: body });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    });
  });

  return new Promise((resolve) => {
    server.listen(8002, () => {
      resolve({
        server,
        port: 8002,
        receivedRequests,
      });
    });
  });
}

export async function sendEventToSnapIn(event: any): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', event, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
  return response.data;
}

export function teardownCallbackServer(setup: CallbackServerSetup): Promise<void> {
  return new Promise((resolve) => {
    setup.server.close(() => {
      resolve();
    });
  });
}