import express from 'express';
import axios from 'axios';
import { Server } from 'http';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
}

export interface CallbackData {
  timestamp: string;
  event_type: string;
  data?: any;
  error?: any;
}

export class TestUtils {
  private static callbackServer: Server | null = null;
  private static callbackData: CallbackData[] = [];

  static getEnvironment(): TestEnvironment {
    const env = {
      TRELLO_API_KEY: process.env.TRELLO_API_KEY,
      TRELLO_TOKEN: process.env.TRELLO_TOKEN,
      TRELLO_ORGANIZATION_ID: process.env.TRELLO_ORGANIZATION_ID,
    };

    if (!env.TRELLO_API_KEY || !env.TRELLO_TOKEN || !env.TRELLO_ORGANIZATION_ID) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
    }

    return env as TestEnvironment;
  }

  static async setupCallbackServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const app = express();
      app.use(express.json());

      app.post('/callback', (req, res) => {
        this.callbackData.push({
          timestamp: new Date().toISOString(),
          event_type: req.body.event_type || 'unknown',
          data: req.body.data,
          error: req.body.error,
        });
        res.status(200).json({ status: 'received' });
      });

      this.callbackServer = app.listen(8002, (err?: Error) => {
        if (err) {
          reject(new Error(`Failed to start callback server: ${err.message}`));
        } else {
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

  static createMetadataExtractionEvent(env: TestEnvironment): any {
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
          org_id: env.TRELLO_ORGANIZATION_ID,
          org_name: 'Test Organization',
          key: `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`,
          key_type: 'oauth',
        },
        event_context: {
          callback_url: 'http://localhost:8002/callback',
          dev_org: 'test-dev-org',
          dev_org_id: 'test-dev-org',
          dev_user: 'test-user',
          dev_user_id: 'test-user',
          external_sync_unit: 'test-sync-unit',
          external_sync_unit_id: '68e8befbf2f641caa9b1e275',
          external_sync_unit_name: 'Test Board',
          external_system: 'trello',
          external_system_type: 'trello',
          import_slug: 'test-import',
          mode: 'INITIAL',
          request_id: 'test-request-123',
          snap_in_slug: 'trello-snap-in',
          snap_in_version_id: 'test-version',
          sync_run: 'test-sync-run',
          sync_run_id: 'test-sync-run',
          sync_tier: 'test-tier',
          sync_unit: 'test-sync-unit',
          sync_unit_id: 'test-sync-unit',
          uuid: 'test-uuid',
          worker_data_url: 'http://localhost:8003/external-worker',
        },
        event_type: 'EXTRACTION_METADATA_START',
        event_data: {},
      },
      execution_metadata: {
        request_id: 'test-request-123',
        function_name: 'extraction',
        event_type: 'extraction',
        devrev_endpoint: 'http://localhost:8003',
      },
      input_data: {
        global_values: {},
        event_sources: {},
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
        throw new Error(`Snap-in request failed: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
      }
      throw error;
    }
  }

  static async waitForCallback(timeoutMs: number = 10000): Promise<CallbackData[]> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (this.callbackData.length > 0) {
        return this.getCallbackData();
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`No callback received within ${timeoutMs}ms`);
  }
}