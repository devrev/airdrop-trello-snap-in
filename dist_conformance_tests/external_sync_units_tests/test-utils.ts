import express from 'express';
import axios from 'axios';
import { Server } from 'http';
import * as fs from 'fs';
import * as path from 'path';

export interface TestEvent {
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
    event_data?: any;
  };
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
}

export class CallbackServer {
  private app: express.Application;
  private server: Server | null = null;
  private receivedCallbacks: any[] = [];

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.post('/callback', (req, res) => {
      this.receivedCallbacks.push({
        timestamp: new Date().toISOString(),
        body: req.body,
        headers: req.headers
      });
      res.status(200).json({ status: 'received' });
    });

    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'healthy' });
    });
  }

  async start(port: number = 8002): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, (err?: Error) => {
        if (err) {
          reject(new Error(`Failed to start callback server on port ${port}: ${err.message}`));
        } else {
          resolve();
        }
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

  getReceivedCallbacks(): any[] {
    return [...this.receivedCallbacks];
  }

  clearCallbacks(): void {
    this.receivedCallbacks = [];
  }

  waitForCallback(timeoutMs: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = 100;

      const check = () => {
        if (this.receivedCallbacks.length > 0) {
          resolve(this.receivedCallbacks[this.receivedCallbacks.length - 1]);
        } else if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Timeout waiting for callback after ${timeoutMs}ms`));
        } else {
          setTimeout(check, checkInterval);
        }
      };

      check();
    });
  }
}

export function createTestEvent(eventType: string): TestEvent {
  const requestId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    payload: {
      connection_data: {
        org_id: process.env.TEST_ORG_ID || 'test-org-123',
        org_name: 'Test Organization',
        key: process.env.TEST_API_KEY || 'test-api-key-456',
        key_type: 'api_key'
      },
      event_context: {
        callback_url: 'http://localhost:8002/callback',
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-user',
        dev_user_id: 'test-user-id',
        external_sync_unit: 'test-sync-unit',
        external_sync_unit_id: 'test-sync-unit-id',
        external_sync_unit_name: 'Test Sync Unit',
        external_system: 'test-system',
        external_system_type: 'test',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: requestId,
        snap_in_slug: 'test-snap-in',
        snap_in_version_id: 'test-version-123',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'standard',
        sync_unit: 'test-unit',
        sync_unit_id: 'test-unit-id',
        uuid: requestId,
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_type: eventType,
      event_data: {}
    },
    context: {
      dev_oid: 'test-dev-org-id',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-version-123',
      service_account_id: 'test-service-account',
      secrets: {
        service_account_token: process.env.TEST_SERVICE_TOKEN || 'test-service-token'
      }
    },
    execution_metadata: {
      request_id: requestId,
      function_name: 'test_external_sync_units',
      event_type: 'airdrop:extraction',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

export function loadTestEventFromJson(jsonFilePath: string): TestEvent {
  try {
    // Read and parse the JSON file
    const fullPath = path.resolve(jsonFilePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`JSON file not found at path: ${fullPath}`);
    }

    const jsonContent = fs.readFileSync(fullPath, 'utf8');
    const jsonData = JSON.parse(jsonContent);
    
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      throw new Error(`Expected JSON file to contain a non-empty array, but received: ${typeof jsonData}`);
    }

    const eventData = jsonData[0];
    const config = getEnvironmentConfig();

    // Transform the JSON structure to match TestEvent interface
    const testEvent: TestEvent = {
      payload: {
        connection_data: {
          org_id: config.testOrgId,
          org_name: eventData.payload?.connection_data?.org_name || 'Test Organization',
          key: config.testApiKey,
          key_type: eventData.payload?.connection_data?.key_type || 'api_key'
        },
        event_context: {
          ...eventData.payload?.event_context,
          callback_url: `http://localhost:${config.callbackServerPort}/callback`,
          worker_data_url: `${config.devrevEndpoint}/external-worker`
        },
        event_type: eventData.payload?.event_type || 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
        event_data: eventData.payload?.event_data || {}
      },
      context: {
        dev_oid: eventData.payload?.event_context?.dev_org || 'test-dev-org-id',
        source_id: 'test-source-id',
        snap_in_id: 'test-snap-in-id',
        snap_in_version_id: eventData.context?.snap_in_version_id || 'test-version-123',
        service_account_id: 'test-service-account',
        secrets: {
          service_account_token: config.testServiceToken
        }
      },
      execution_metadata: {
        request_id: `json-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        function_name: eventData.execution_metadata?.function_name || 'test_external_sync_units',
        event_type: 'airdrop:extraction',
        devrev_endpoint: eventData.execution_metadata?.devrev_endpoint || config.devrevEndpoint
      },
      input_data: {
        global_values: {},
        event_sources: {}
      }
    };

    return testEvent;
  } catch (error) {
    throw new Error(`Failed to load test event from JSON file '${jsonFilePath}': ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function sendEventToSnapIn(event: TestEvent): Promise<any> {
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', event, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to send event to snap-in: ${error.message}. Status: ${error.response?.status}, Data: ${JSON.stringify(error.response?.data)}`);
    }
    throw new Error(`Failed to send event to snap-in: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getEnvironmentConfig() {
  return {
    snapInServerUrl: 'http://localhost:8000/handle/sync',
    callbackServerPort: 8002,
    devrevEndpoint: 'http://localhost:8003',
    apiServerUrl: 'http://localhost:8004',
    testOrgId: process.env.TEST_ORG_ID || 'test-org-123',
    testApiKey: process.env.TEST_API_KEY || 'test-api-key-456',
    testServiceToken: process.env.TEST_SERVICE_TOKEN || 'test-service-token'
  };
}