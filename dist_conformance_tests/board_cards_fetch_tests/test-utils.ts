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
  receivedRequests: any[];
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
      function_name: 'fetch_board_cards',
      event_type: 'test-event-type',
      devrev_endpoint: 'http://localhost:8003',
    },
    payload: {
      connection_data: {
        key: `key=${env.trelloApiKey}&token=${env.trelloToken}`,
        org_id: env.trelloOrganizationId,
      },
      event_context: {
        external_sync_unit_id: '68e8befbf2f641caa9b1e275',
      },
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
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        receivedRequests.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: body,
          parseError: error,
          timestamp: new Date().toISOString(),
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'received' }));
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(8002, (error?: Error) => {
      if (error) {
        reject(error);
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

export async function teardownCallbackServer(setup: CallbackServerSetup): Promise<void> {
  return new Promise((resolve) => {
    setup.server.close(() => {
      resolve();
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
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`HTTP ${error.response?.status}: ${error.response?.data || error.message}`);
    }
    throw error;
  }
}

/**
 * Starts rate limiting on the mock API server for testing rate limit handling.
 * @param testName Identifier for the test to help with debugging
 */
export async function startRateLimiting(testName: string): Promise<void> {
  try {
    console.log(`Starting rate limiting for test: ${testName}`);
    const response = await axios.post('http://localhost:8004/start_rate_limiting', {
      test_name: testName
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    console.log(`Rate limiting started successfully for test: ${testName}`, {
      status: response.status,
      data: response.data
    });
  } catch (error) {
    console.error(`Failed to start rate limiting for test: ${testName}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to start rate limiting for test "${testName}": HTTP ${error.response?.status}: ${error.response?.data || error.message}`);
    }
    throw new Error(`Failed to start rate limiting for test "${testName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Ends rate limiting on the mock API server.
 */
export async function endRateLimiting(): Promise<void> {
  try {
    console.log('Ending rate limiting');
    const response = await axios.post('http://localhost:8004/end_rate_limiting', {}, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    console.log('Rate limiting ended successfully', {
      status: response.status,
      data: response.data
    });
  } catch (error) {
    console.error('Failed to end rate limiting', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to end rate limiting: HTTP ${error.response?.status}: ${error.response?.data || error.message}`);
    }
    throw new Error(`Failed to end rate limiting: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}