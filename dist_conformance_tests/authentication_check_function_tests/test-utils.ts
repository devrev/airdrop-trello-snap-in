import axios from 'axios';
import * as http from 'http';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
  TRELLO_BASE_URL: string;
}

export interface CallbackServerSetup {
  server: http.Server;
  port: number;
  receivedRequests: any[];
}

export class TestUtils {
  private static environment: TestEnvironment;

  static getEnvironment(): TestEnvironment {
    if (!this.environment) {
      const requiredVars = ['TRELLO_API_KEY', 'TRELLO_TOKEN', 'TRELLO_ORGANIZATION_ID'];
      const missing = requiredVars.filter(varName => !process.env[varName]);
      
      if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }

      this.environment = {
        TRELLO_API_KEY: process.env.TRELLO_API_KEY!,
        TRELLO_TOKEN: process.env.TRELLO_TOKEN!,
        TRELLO_ORGANIZATION_ID: process.env.TRELLO_ORGANIZATION_ID!,
        TRELLO_BASE_URL: process.env.TRELLO_BASE_URL || 'http://localhost:8004'
      };
    }
    return this.environment;
  }

  static createBaseEvent(functionName: string, eventType: string = 'test_event'): any {
    const env = this.getEnvironment();
    
    return {
      payload: {
        connection_data: {
          org_id: env.TRELLO_ORGANIZATION_ID,
          org_name: 'Test Organization',
          key: `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`,
          key_type: 'oauth'
        },
        event_context: {
          callback_url: 'http://localhost:8002/callback',
          dev_org: 'test-org',
          dev_org_id: 'test-org-id',
          dev_user: 'test-user',
          dev_user_id: 'test-user-id',
          external_sync_unit: '688725dad59c015ce052eecf',
          external_sync_unit_id: '688725dad59c015ce052eecf',
          external_sync_unit_name: 'Test Board',
          external_system: 'trello',
          external_system_type: 'trello',
          import_slug: 'test-import',
          mode: 'INITIAL',
          request_id: `test-request-${Date.now()}`,
          snap_in_slug: 'trello-snap-in',
          snap_in_version_id: 'v1.0.0',
          sync_run: 'test-sync-run',
          sync_run_id: 'test-sync-run-id',
          sync_tier: 'standard',
          sync_unit: 'test-sync-unit',
          sync_unit_id: 'test-sync-unit-id',
          uuid: `test-uuid-${Date.now()}`,
          worker_data_url: 'http://localhost:8003/external-worker'
        },
        event_type: eventType
      },
      context: {
        dev_oid: 'test-dev-oid',
        source_id: 'test-source-id',
        snap_in_id: 'test-snap-in-id',
        snap_in_version_id: 'v1.0.0',
        service_account_id: 'test-service-account',
        secrets: {
          service_account_token: 'test-token'
        }
      },
      execution_metadata: {
        request_id: `test-request-${Date.now()}`,
        function_name: functionName,
        event_type: eventType,
        devrev_endpoint: 'http://localhost:8003'
      },
      input_data: {
        global_values: {},
        event_sources: {}
      }
    };
  }

  static async setupCallbackServer(): Promise<CallbackServerSetup> {
    const receivedRequests: any[] = [];
    const port = 8002;

    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => {
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
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          receivedRequests.push({
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: body,
            timestamp: new Date().toISOString(),
            parseError: e
          });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'received' }));
      });
    });

    return new Promise((resolve, reject) => {
      server.listen(port, (err?: Error) => {
        if (err) {
          reject(new Error(`Failed to start callback server on port ${port}: ${err.message}`));
        } else {
          resolve({ server, port, receivedRequests });
        }
      });
    });
  }

  static async sendEventToSnapIn(event: any): Promise<any> {
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
        throw new Error(`Failed to send event to snap-in server: ${error.message}. Status: ${error.response?.status}, Data: ${JSON.stringify(error.response?.data)}`);
      }
      throw new Error(`Failed to send event to snap-in server: ${error}`);
    }
  }

  static async closeServer(server: http.Server): Promise<void> {
    return new Promise((resolve) => {
      server.close(() => resolve());
    });
  }

  /**
   * Start rate limiting on the API server for testing
   * @param testName Identifier for the test to help with debugging
   */
  static async startRateLimiting(testName: string): Promise<void> {
    try {
      const response = await axios.post('http://localhost:8004/start_rate_limiting', {
        test_name: testName
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.status !== 200) {
        throw new Error(`Failed to start rate limiting. Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to start rate limiting for test '${testName}': ${error.message}. Status: ${error.response?.status}, Data: ${JSON.stringify(error.response?.data)}`);
      }
      throw new Error(`Failed to start rate limiting for test '${testName}': ${error}`);
    }
  }

  /**
   * End rate limiting on the API server
   */
  static async endRateLimiting(): Promise<void> {
    try {
      const response = await axios.post('http://localhost:8004/end_rate_limiting', {}, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response.status !== 200) {
        throw new Error(`Failed to end rate limiting. Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to end rate limiting: ${error.message}. Status: ${error.response?.status}, Data: ${JSON.stringify(error.response?.data)}`);
      }
      throw new Error(`Failed to end rate limiting: ${error}`);
    }
  }
}