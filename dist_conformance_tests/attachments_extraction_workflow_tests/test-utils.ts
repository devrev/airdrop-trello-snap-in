import axios from 'axios';
import express from 'express';
import { Server } from 'http';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
}

export interface CallbackData {
  method: string;
  url: string;
  body: any;
  headers: any;
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
    return new Promise((resolve) => {
      const app = express();
      app.use(express.json());
      
      app.all('*', (req, res) => {
        TestUtils.callbackData.push({
          method: req.method,
          url: req.url,
          body: req.body,
          headers: req.headers,
        });
        res.status(200).json({ received: true });
      });

      TestUtils.callbackServer = app.listen(8002, () => {
        console.log('Callback server started on port 8002');
        resolve();
      });
    });
  }

  static async teardownCallbackServer(): Promise<void> {
    return new Promise((resolve) => {
      if (TestUtils.callbackServer) {
        TestUtils.callbackServer.close(() => {
          TestUtils.callbackServer = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  static getCallbackData(): CallbackData[] {
    return [...TestUtils.callbackData];
  }

  static clearCallbackData(): void {
    TestUtils.callbackData = [];
  }

  static async sendEventToSnapIn(event: any): Promise<any> {
    try {
      const response = await axios.post('http://localhost:8000/handle/sync', event, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Snap-in server error: ${error.response?.status} - ${error.response?.data || error.message}`);
      }
      throw error;
    }
  }

  static createExtractionEvent(eventType: string, env: TestEnvironment, additionalData: any = {}): any {
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
          org_id: env.TRELLO_ORGANIZATION_ID,
          org_name: "Test Organization",
          key: `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`,
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
          request_id: "test-request-id",
          snap_in_slug: "trello-snap-in",
          snap_in_version_id: "test-version",
          sync_run: "test-sync-run",
          sync_run_id: "test-sync-run",
          sync_tier: "test-tier",
          sync_unit: "test-sync-unit",
          sync_unit_id: "test-sync-unit",
          uuid: "test-uuid",
          worker_data_url: "http://localhost:8003/external-worker",
          ...additionalData
        },
        event_type: eventType,
        event_data: {}
      },
      execution_metadata: {
        request_id: "test-request-id",
        function_name: "extraction",
        event_type: eventType,
        devrev_endpoint: "http://localhost:8003"
      },
      input_data: {
        global_values: {},
        event_sources: {}
      }
    };
  }
}