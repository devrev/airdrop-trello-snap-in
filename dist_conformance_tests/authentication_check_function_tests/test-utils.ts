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

export function createTestEvent(connectionKey: string, orgId: string): any {
  return {
    payload: {
      connection_data: {
        org_id: orgId,
        org_name: 'Test Organization',
        key: connectionKey,
        key_type: 'oauth',
      },
      event_context: {
        callback_url: 'http://localhost:8002/callback',
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-user',
        dev_user_id: 'test-user-id',
        external_sync_unit: '688725dad59c015ce052eecf',
        external_sync_unit_id: '688725dad59c015ce052eecf',
        external_sync_unit_name: 'Test Board',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: 'test-request-id',
        snap_in_slug: 'trello-snap-in',
        snap_in_version_id: 'test-version-id',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'standard',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'http://localhost:8003/external-worker',
      },
      event_type: 'test_authentication',
    },
    context: {
      dev_oid: 'test-dev-org-id',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token',
      },
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: 'check_authentication',
      event_type: 'test_authentication',
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
        receivedRequests.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: parsedBody,
        });
      } catch (e) {
        receivedRequests.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: body,
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'received' }));
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(8002, (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          server,
          port: 8002,
          receivedRequests,
        });
      }
    });
  });
}

export async function sendEventToSnapIn(event: any): Promise<any> {
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', event, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `Snap-in server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      );
    } else if (error.request) {
      throw new Error('Network error: Unable to reach snap-in server at localhost:8000');
    } else {
      throw new Error(`Request setup error: ${error.message}`);
    }
  }
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
      throw new Error(`Failed to start rate limiting: HTTP ${response.status} - ${JSON.stringify(response.data)}`);
    }
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `Rate limiting API error when starting: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      );
    } else if (error.request) {
      throw new Error('Network error: Unable to reach rate limiting API at localhost:8004 for start_rate_limiting');
    } else {
      throw new Error(`Rate limiting start request setup error: ${error.message}`);
    }
  }
}

export async function endRateLimiting(): Promise<void> {
  try {
    const response = await axios.post('http://localhost:8004/end_rate_limiting', {}, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to end rate limiting: HTTP ${response.status} - ${JSON.stringify(response.data)}`);
    }
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `Rate limiting API error when ending: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      );
    } else if (error.request) {
      throw new Error('Network error: Unable to reach rate limiting API at localhost:8004 for end_rate_limiting');
    } else {
      throw new Error(`Rate limiting end request setup error: ${error.message}`);
    }
  }
}