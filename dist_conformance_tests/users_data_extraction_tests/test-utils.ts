import axios from 'axios';
import * as http from 'http';
import { execSync } from 'child_process';


export interface TestEnvironment {
  trelloApiKey: string;
  trelloToken: string;
  trelloOrganizationId: string;
}

export interface CallbackServerSetup {
  server: http.Server;
  port: number;
  receivedEvents: any[];
  close: () => Promise<void>;
}

/**
 * Reads required environment variables for testing
 */
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
  
  // Validate additional environment variables for normalization tests
  const chefCliPath = process.env.CHEF_CLI_PATH;
  const extractedFilesFolderPath = process.env.EXTRACTED_FILES_FOLDER_PATH;
  
  // Note: These are not required for all tests, so we don't throw errors here
  // Individual tests will validate these as needed

  return {
    trelloApiKey,
    trelloToken,
    trelloOrganizationId,
  };
}

/**
 * Sets up callback server for testing
 */
export function setupCallbackServer(): Promise<CallbackServerSetup> {
  return new Promise((resolve, reject) => {
    const receivedEvents: any[] = [];
    const server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const event = JSON.parse(body);
            receivedEvents.push({
              timestamp: new Date().toISOString(),
              event,
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'received' }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(8002, (error?: Error) => {
      if (error) {
        reject(error);
      } else {
        resolve({
          server,
          port: 8002,
          receivedEvents,
          close: () => new Promise((resolveClose) => {
            server.close(() => resolveClose());
          }),
        });
      }
    });
  });
}

/**
 * Creates base event payload for extraction tests
 */
export function createExtractionEventPayload(
  eventType: string,
  env: TestEnvironment,
  initialState?: any
): any {
  return {
    context: {
      dev_oid: 'test-dev-org',
      source_id: 'test-source',
      snap_in_id: 'test-snap-in',
      snap_in_version_id: 'test-version',
      service_account_id: 'test-service-account',
      secrets: {
        service_account_token: 'test-token',
      },
    },
    payload: {
      connection_data: {
        org_id: env.trelloOrganizationId,
        org_name: 'Test Organization',
        key: `key=${env.trelloApiKey}&token=${env.trelloToken}`,
        key_type: 'oauth',
      },
      event_context: {
        callback_url: 'http://localhost:8002',
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org',
        dev_user: 'test-user',
        dev_user_id: 'test-user',
        external_sync_unit: '68e8befbf2f641caa9b1e275',
        external_sync_unit_id: '68e8befbf2f641caa9b1e275',
        external_sync_unit_name: 'Test Board',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: `test-request-${Date.now()}`,
        snap_in_slug: 'trello-snap-in',
        snap_in_version_id: 'test-version',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run',
        sync_tier: 'test-tier',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit',
        uuid: `test-uuid-${Date.now()}`,
        worker_data_url: 'http://localhost:8003/external-worker',
      },
      event_type: eventType,
      event_data: initialState ? { initial_state: initialState } : {},
    },
    execution_metadata: {
      request_id: `test-request-${Date.now()}`,
      function_name: 'extraction',
      event_type: eventType,
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
  };
}

/**
 * Sends event to snap-in server and returns response
 */
export async function sendEventToSnapIn(event: any): Promise<any> {
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', event, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error: any) {
    return {
      success: false,
      status: error.response?.status || 500,
      data: error.response?.data || null,
      error: error.message,
    };
  }
}

/**
 * Controls rate limiting for testing purposes
 */
export async function controlRateLimiting(action: 'start' | 'end', testName?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (action === 'start') {
      if (!testName) {
        throw new Error('Test name is required when starting rate limiting');
      }
      const response = await axios.post('http://localhost:8004/start_rate_limiting', {
        test_name: testName,
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return { success: response.status === 200 };
    } else {
      const response = await axios.post('http://localhost:8004/end_rate_limiting', {}, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return { success: response.status === 200 };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}