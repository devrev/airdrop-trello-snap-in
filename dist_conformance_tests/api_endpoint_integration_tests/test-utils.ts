import axios from 'axios';
import * as http from 'http';

export interface TestCredentials {
  trelloApiKey: string;
  trelloToken: string;
  trelloOrgId: string;
}

export interface TestEventPayload {
  context: {
    dev_oid: string;
    source_id: string;
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
  payload: {
    connection_data: {
      org_id: string;
      org_name: string;
      key: string;
      key_type: string;
    };
    event_context: {
      callback_url: string;
      dev_org: string;
      dev_org_id: string;
      dev_user: string;
      dev_user_id: string;
      external_sync_unit: string;
      external_sync_unit_id: string;
      external_sync_unit_name: string;
      external_system: string;
      external_system_type: string;
      import_slug: string;
      mode: string;
      request_id: string;
      snap_in_slug: string;
      snap_in_version_id: string;
      sync_run: string;
      sync_run_id: string;
      sync_tier: string;
      sync_unit: string;
      sync_unit_id: string;
      uuid: string;
      worker_data_url: string;
    };
    event_type: string;
    event_data: Record<string, any>;
  };
}

export function getTestCredentials(): TestCredentials {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!trelloApiKey) {
    throw new Error('TRELLO_API_KEY environment variable is required');
  }
  if (!trelloToken) {
    throw new Error('TRELLO_TOKEN environment variable is required');
  }
  if (!trelloOrgId) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is required');
  }

  return {
    trelloApiKey,
    trelloToken,
    trelloOrgId,
  };
}

export function createTestEventPayload(functionName: string, credentials: TestCredentials): TestEventPayload {
  const connectionKey = `key=${credentials.trelloApiKey}&token=${credentials.trelloToken}`;
  
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
      function_name: functionName,
      event_type: 'test-event-type',
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
    payload: {
      connection_data: {
        org_id: credentials.trelloOrgId,
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
        external_sync_unit: '68e8befbf2f641caa9b1e275',
        external_sync_unit_id: '68e8befbf2f641caa9b1e275',
        external_sync_unit_name: 'Test Board',
        external_system: 'trello',
        external_system_type: 'project_management',
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
      event_type: 'test-event-type',
      event_data: {},
    },
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
          reject(new Error(`Failed to start callback server on port ${this.port}: ${err.message}`));
        } else {
          resolve();
        }
      });

      this.server.on('error', (err) => {
        reject(new Error(`Callback server error: ${err.message}`));
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export async function callSnapInFunction(functionName: string, payload: TestEventPayload): Promise<any> {
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to call snap-in function ${functionName}: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
    }
    throw new Error(`Failed to call snap-in function ${functionName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      throw new Error(`Failed to start rate limiting: HTTP ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to start rate limiting for test "${testName}": ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
    }
    throw new Error(`Failed to start rate limiting for test "${testName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function endRateLimiting(): Promise<void> {
  try {
    await axios.post('http://localhost:8004/end_rate_limiting', {}, {
      timeout: 10000,
    });
  } catch (error) {
    // Log but don't throw - cleanup should not fail the test
    console.warn(`Warning: Failed to end rate limiting: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}