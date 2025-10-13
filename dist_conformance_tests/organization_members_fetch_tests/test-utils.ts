import axios from 'axios';
import * as http from 'http';

export interface TestEnvironment {
  trelloApiKey: string;
  trelloToken: string;
  trelloOrganizationId: string;
}

export interface CallbackServerSetup {
  server: http.Server;
  port: number;
  receivedEvents: any[];
}

export function getTestEnvironment(): TestEnvironment {
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

export function createBaseTestEvent(env: TestEnvironment): any {
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
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: 'fetch_organization_members',
      event_type: 'test-event',
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
    payload: {
      connection_data: {
        key: `key=${env.trelloApiKey}&token=${env.trelloToken}`,
        org_id: env.trelloOrganizationId,
        org_name: 'Test Organization',
        key_type: 'oauth',
      },
      event_context: {
        callback_url: 'http://localhost:8002/callback',
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-dev-user',
        dev_user_id: 'test-dev-user-id',
        external_sync_unit: '68e8befbf2f641caa9b1e275',
        external_sync_unit_id: '68e8befbf2f641caa9b1e275',
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
      event_type: 'test-event',
      event_data: {},
    },
  };
}

export async function setupCallbackServer(): Promise<CallbackServerSetup> {
  const receivedEvents: any[] = [];
  const port = 8002;

  const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const event = JSON.parse(body);
          receivedEvents.push(event);
        } catch (error) {
          console.error('Failed to parse callback event:', error);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'received' }));
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, (error?: Error) => {
      if (error) {
        reject(error);
      } else {
        resolve({ server, port, receivedEvents });
      }
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

export async function startRateLimiting(testName: string): Promise<void> {
  try {
    const response = await axios.post('http://localhost:8004/start_rate_limiting', {
      test_name: testName
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to start rate limiting: HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Failed to start rate limiting: ${error instanceof Error ? error.message : error}`);
  }
}

export async function endRateLimiting(): Promise<void> {
  try {
    const response = await axios.post('http://localhost:8004/end_rate_limiting', {}, {
      timeout: 10000,
    });
  } catch (error) {
    console.warn(`Failed to end rate limiting (cleanup): ${error instanceof Error ? error.message : error}`);
  }
}