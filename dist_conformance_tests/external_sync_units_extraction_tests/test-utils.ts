import * as http from 'http';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export interface TestCredentials {
  apiKey: string;
  token: string;
  organizationId: string;
}

export interface CallbackEvent {
  event_type: string;
  event_data?: any;
  timestamp: string;
}

export class TestEnvironment {
  private callbackServer: http.Server | null = null;
  private receivedEvents: CallbackEvent[] = [];
  private credentials: TestCredentials;

  constructor() {
    this.credentials = this.loadCredentials();
  }

  private loadCredentials(): TestCredentials {
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const organizationId = process.env.TRELLO_ORGANIZATION_ID;

    if (!apiKey || !token || !organizationId) {
      throw new Error(
        'Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID'
      );
    }

    return { apiKey, token, organizationId };
  }

  getCredentials(): TestCredentials {
    return this.credentials;
  }

  async startCallbackServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.callbackServer = http.createServer((req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const event = JSON.parse(body);
              this.receivedEvents.push({
                ...event,
                timestamp: new Date().toISOString()
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

      this.callbackServer.listen(8002, (err?: Error) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async stopCallbackServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.callbackServer) {
        this.callbackServer.close(() => {
          this.callbackServer = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getReceivedEvents(): CallbackEvent[] {
    return [...this.receivedEvents];
  }

  clearReceivedEvents(): void {
    this.receivedEvents = [];
  }

  async sendEventToSnapIn(event: any): Promise<any> {
    try {
      const response = await axios.post('http://localhost:8000/handle/sync', event, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Snap-in server error: ${error.response?.status} - ${error.message}`);
      }
      throw error;
    }
  }

  createExternalSyncUnitsStartEvent(): any {
    return {
      payload: {
        connection_data: {
          org_id: this.credentials.organizationId,
          org_name: "Test Organization",
          key: `key=${this.credentials.apiKey}&token=${this.credentials.token}`,
          key_type: "oauth"
        },
        event_context: {
          callback_url: "http://localhost:8002",
          dev_org: "test-org",
          dev_org_id: "test-org-id",
          dev_user: "test-user",
          dev_user_id: "test-user-id",
          external_sync_unit: "test-unit",
          external_sync_unit_id: "68e8befbf2f641caa9b1e275",
          external_sync_unit_name: "Test Board",
          external_system: "trello",
          external_system_type: "trello",
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
        event_type: "EXTRACTION_EXTERNAL_SYNC_UNITS_START",
        event_data: {}
      },
      context: {
        dev_oid: "test-org-id",
        source_id: "test-source",
        snap_in_id: "trello-snap-in",
        snap_in_version_id: "v1.0.0",
        service_account_id: "test-service-account",
        secrets: {
          service_account_token: "test-token"
        }
      },
      execution_metadata: {
        request_id: "test-request-123",
        function_name: "extraction",
        event_type: "EXTRACTION_EXTERNAL_SYNC_UNITS_START",
        devrev_endpoint: "http://localhost:8003"
      },
      input_data: {
        global_values: {},
        event_sources: {}
      }
    };
  }

  loadEventFromJsonFile(filename: string): any {
    try {
      const filePath = path.join(__dirname, filename);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      let eventData = fileContent;

      // Replace placeholders with actual credentials
      eventData = eventData.replace(/<TRELLO_API_KEY>/g, this.credentials.apiKey);
      eventData = eventData.replace(/<TRELLO_TOKEN>/g, this.credentials.token);
      eventData = eventData.replace(/<TRELLO_ORGANIZATION_ID>/g, this.credentials.organizationId);

      return JSON.parse(eventData);
    } catch (error) {
      throw new Error(`Failed to load event from JSON file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async waitForEvents(expectedCount: number, timeoutMs: number = 10000): Promise<CallbackEvent[]> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (this.receivedEvents.length >= expectedCount) {
        return this.getReceivedEvents();
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(
      `Timeout waiting for ${expectedCount} events. Received ${this.receivedEvents.length} events: ${JSON.stringify(this.receivedEvents, null, 2)}`
    );
  }

  async startRateLimiting(testName: string): Promise<void> {
    try {
      await axios.post('http://localhost:8004/start_rate_limiting', { test_name: testName });
    } catch (error) {
      throw new Error(`Failed to start rate limiting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async endRateLimiting(): Promise<void> {
    try {
      await axios.post('http://localhost:8004/end_rate_limiting');
    } catch (error) {
      throw new Error(`Failed to end rate limiting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}