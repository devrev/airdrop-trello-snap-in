import axios from 'axios';
import * as http from 'http';

export interface TestEnvironment {
  trelloApiKey: string;
  trelloToken: string;
  trelloOrganizationId: string;
}

export interface CallbackData {
  event_type: string;
  event_context?: any;
  event_data?: any;
  worker_metadata?: any;
}

export class TestUtils {
  private static callbackServer: http.Server | null = null;
  private static callbackData: CallbackData[] = [];

  static getEnvironment(): TestEnvironment {
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
      trelloOrganizationId,
    };
  }

  static async setupCallbackServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.callbackData = [];
      this.callbackServer = http.createServer((req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              console.log('Callback server received:', JSON.stringify(data, null, 2));
              this.callbackData.push(data);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'received' }));
            } catch (error) {
              console.error('Failed to parse callback data:', error);
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      this.callbackServer.listen(8002, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          console.log('Callback server started on port 8002');
          resolve();
        }
      });
    });
  }

  static async teardownCallbackServer(): Promise<void> {
    return new Promise((resolve) => {
      if (this.callbackServer) {
        this.callbackServer.close(() => {
          this.callbackServer = null;
          console.log('Callback server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  static getCallbackData(): CallbackData[] {
    return [...this.callbackData];
  }

  static clearCallbackData(): void {
    this.callbackData = [];
  }

  static createBaseEvent(eventType: string, env: TestEnvironment) {
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
        function_name: 'extraction',
        event_type: 'airdrop_event',
        devrev_endpoint: 'http://localhost:8003',
      },
      input_data: {
        global_values: {},
        event_sources: {},
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
          snap_in_slug: 'test-snap-in-slug',
          snap_in_version_id: 'test-snap-in-version-id',
          sync_run: 'test-sync-run',
          sync_run_id: 'test-sync-run-id',
          sync_tier: 'test-sync-tier',
          sync_unit: 'test-sync-unit',
          sync_unit_id: 'test-sync-unit-id',
          uuid: 'test-uuid',
          worker_data_url: 'http://localhost:8003/external-worker',
        },
        event_type: eventType,
        event_data: {},
      },
    };
  }

  static async sendEventToSnapIn(event: any): Promise<any> {
    try {
      const response = await axios.post('http://localhost:8000/handle/sync', event, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to send event to snap-in server: ${error.message}. ` +
          `Status: ${error.response?.status}, Data: ${JSON.stringify(error.response?.data)}`
        );
      }
      throw error;
    }
  }

  static async waitForCallback(timeoutMs: number = 10000): Promise<CallbackData[]> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (this.callbackData.length > 0) {
        return [...this.callbackData];
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`No callback received within ${timeoutMs}ms`);
  }

  static async waitForSpecificCallback(eventType: string, timeoutMs: number = 10000): Promise<CallbackData> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const callback = this.callbackData.find(cb => cb.event_type === eventType);
      if (callback) {
        return callback;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`No callback with event_type '${eventType}' received within ${timeoutMs}ms`);
  }
}