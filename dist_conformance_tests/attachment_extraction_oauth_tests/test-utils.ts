import axios from 'axios';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

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
 * Sends event to snap-in server and returns response
 */
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
      throw new Error(`Snap-in server request failed: ${error.message}. Status: ${error.response?.status}. Data: ${JSON.stringify(error.response?.data)}`);
    }
    throw error;
  }
}

/**
 * Creates base event structure for attachment extraction tests
 */
export function createBaseAttachmentEvent(env: TestEnvironment, eventType: string): any {
  return {
    context: {
      dev_oid: "test-dev-org",
      source_id: "test-source",
      snap_in_id: "test-snap-in",
      snap_in_version_id: "test-version",
      service_account_id: "test-service-account",
      secrets: {
        service_account_token: "test-token"
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
        dev_org_id: "test-dev-org",
        dev_user: "test-user",
        dev_user_id: "test-user",
        external_sync_unit: "68e8befbf2f641caa9b1e275",
        external_sync_unit_id: "68e8befbf2f641caa9b1e275",
        external_sync_unit_name: "Test Board",
        external_system: "trello",
        external_system_type: "trello",
        import_slug: "test-import",
        mode: "INITIAL",
        request_id: `test-request-${Date.now()}`,
        snap_in_slug: "trello-snap-in",
        snap_in_version_id: "test-version",
        sync_run: "test-sync-run",
        sync_run_id: "test-sync-run",
        sync_tier: "test-tier",
        sync_unit: "test-sync-unit",
        sync_unit_id: "test-sync-unit",
        uuid: `test-uuid-${Date.now()}`,
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_type: eventType,
      event_data: {}
    },
    execution_metadata: {
      request_id: `test-request-${Date.now()}`,
      function_name: "extraction",
      event_type: "airdrop_extraction",
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

/**
 * Loads and processes a JSON test file, replacing credential placeholders
 */
export function loadTestEventFromFile(filename: string, env: TestEnvironment): any {
  const filePath = path.join(__dirname, filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test file not found: ${filePath}`);
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace credential placeholders
  content = content.replace(/<TRELLO_API_KEY>/g, env.trelloApiKey);
  content = content.replace(/<TRELLO_TOKEN>/g, env.trelloToken);
  content = content.replace(/<TRELLO_ORGANIZATION_ID>/g, env.trelloOrganizationId);
  
  try {
    const events = JSON.parse(content);
    if (!Array.isArray(events) || events.length === 0) {
      throw new Error(`Invalid test file format: ${filename} must contain an array with at least one event`);
    }
    return events[0]; // Return the first event as per test requirements
  } catch (error) {
    throw new Error(`Failed to parse test file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Waits for a specific callback event with timeout
 */
export async function waitForCallbackEvent(
  callbackServer: CallbackServerSetup,
  expectedEventType: string,
  timeoutMs: number = 30000
): Promise<any> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const matchingEvent = callbackServer.receivedEvents.find(e => 
      e.event && e.event.event_type === expectedEventType
    );
    
    if (matchingEvent) {
      return matchingEvent.event;
    }
    
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(
    `Timeout waiting for callback event '${expectedEventType}' after ${timeoutMs}ms. ` +
    `Received events: ${JSON.stringify(callbackServer.receivedEvents.map(e => ({
      timestamp: e.timestamp,
      event_type: e.event?.event_type,
      event_data_keys: e.event?.event_data ? Object.keys(e.event.event_data) : []
    })), null, 2)}`
  );
}

/**
 * Verifies artifact upload status
 */
export async function verifyArtifactUpload(artifactId: string): Promise<void> {
  const url = `http://localhost:8003/is_uploaded/${artifactId}`;
  
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: (status) => status === 200 || status === 404
    });
    
    if (response.status !== 200) {
      throw new Error(
        `Artifact upload verification failed. Expected status 200, got ${response.status}. ` +
        `URL: ${url}, Response: ${JSON.stringify(response.data)}`
      );
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to verify artifact upload for ${artifactId}: ${error.message}. URL: ${url}`);
    }
    throw error;
  }
}

/**
 * Starts rate limiting for attachment extraction testing
 */
export async function startRateLimiting(testName: string): Promise<void> {
  const url = 'http://localhost:8004/start_rate_limiting';
  
  try {
    const response = await axios.post(url, { test_name: testName }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to start rate limiting. Status: ${response.status}, Response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to start rate limiting for test '${testName}': ${error.message}. URL: ${url}`);
    }
    throw error;
  }
}

/**
 * Ends rate limiting for attachment extraction testing
 */
export async function endRateLimiting(): Promise<void> {
  const url = 'http://localhost:8004/end_rate_limiting';
  
  try {
    const response = await axios.post(url, {}, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to end rate limiting. Status: ${response.status}, Response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to end rate limiting: ${error.message}. URL: ${url}`);
    }
    throw error;
  }
}