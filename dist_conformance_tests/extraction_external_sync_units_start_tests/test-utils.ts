import express from 'express';
import axios from 'axios';
import { Server } from 'http';
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
  error?: any;
}

export class TestEnvironment {
  private callbackServer: Server | null = null;
  private receivedEvents: CallbackEvent[] = [];

  constructor(private credentials: TestCredentials) {}

  async setupCallbackServer(): Promise<void> {
    return new Promise((resolve) => {
      const app = express();
      app.use(express.json());

      app.post('/callback', (req, res) => {
        console.log('Received callback event:', JSON.stringify(req.body, null, 2));
        this.receivedEvents.push(req.body);
        res.status(200).send('OK');
      });

      this.callbackServer = app.listen(8002, () => {
        console.log('Callback server started on port 8002');
        resolve();
      });
    });
  }

  async teardownCallbackServer(): Promise<void> {
    if (this.callbackServer) {
      return new Promise((resolve) => {
        this.callbackServer!.close(() => {
          console.log('Callback server stopped');
          this.callbackServer = null;
          resolve();
        });
      });
    }
  }

  getReceivedEvents(): CallbackEvent[] {
    return [...this.receivedEvents];
  }

  clearReceivedEvents(): void {
    this.receivedEvents = [];
  }

  loadAndProcessTestEvent(jsonFileName: string): any {
    const jsonFilePath = path.join(__dirname, jsonFileName);
    
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error(`Test event JSON file not found: ${jsonFilePath}`);
    }
    
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
    let testEventArray;
    
    try {
      testEventArray = JSON.parse(jsonContent);
    } catch (error) {
      throw new Error(`Failed to parse JSON file ${jsonFileName}: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    if (!Array.isArray(testEventArray) || testEventArray.length === 0) {
      throw new Error(`Test event JSON file ${jsonFileName} should contain a non-empty array`);
    }
    
    const testEvent = testEventArray[0];
    
    // Replace credential placeholders
    const processedEvent = this.replaceCredentialPlaceholders(testEvent);
    
    return processedEvent;
  }

  private replaceCredentialPlaceholders(event: any): any {
    const eventStr = JSON.stringify(event);
    
    const processedStr = eventStr
      .replace(/TRELLO_API_KEY_PLACEHOLDER/g, this.credentials.apiKey)
      .replace(/TRELLO_TOKEN_PLACEHOLDER/g, this.credentials.token)
      .replace(/TRELLO_ORGANIZATION_ID_PLACEHOLDER/g, this.credentials.organizationId);
    
    return JSON.parse(processedStr);
  }

  async waitForCallbackEvent(eventType: string, timeoutMs: number = 30000): Promise<CallbackEvent> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const matchingEvents = this.receivedEvents.filter(event => event.event_type === eventType);
      
      if (matchingEvents.length > 0) {
        return matchingEvents[0];
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const receivedEventTypes = this.receivedEvents.map(event => event.event_type);
    throw new Error(
      `Timeout waiting for callback event '${eventType}' after ${timeoutMs}ms. ` +
      `Received events: [${receivedEventTypes.join(', ')}]. ` +
      `Total events received: ${this.receivedEvents.length}. ` +
      `Full event details: ${JSON.stringify(this.receivedEvents, null, 2)}`
    );
  }

  async waitForAnyCallbackEvent(eventTypes: string[], timeoutMs: number = 30000): Promise<CallbackEvent> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const matchingEvents = this.receivedEvents.filter(event => eventTypes.includes(event.event_type));
      
      if (matchingEvents.length > 0) {
        return matchingEvents[0];
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const receivedEventTypes = this.receivedEvents.map(event => event.event_type);
    throw new Error(
      `Timeout waiting for any callback event from [${eventTypes.join(', ')}] after ${timeoutMs}ms. ` +
      `Received events: [${receivedEventTypes.join(', ')}]. ` +
      `Total events received: ${this.receivedEvents.length}. ` +
      `Full event details: ${JSON.stringify(this.receivedEvents, null, 2)}`
    );
  }

  async startRateLimiting(testName: string): Promise<any> {
    try {
      console.log(`Starting rate limiting for test: ${testName}`);
      const response = await axios.post('http://localhost:8004/start_rate_limiting', {
        test_name: testName
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('Start rate limiting response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorDetails = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        };
        console.error('Failed to start rate limiting:', errorDetails);
        throw new Error(`Failed to start rate limiting: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
      } else {
        console.error('Non-axios error starting rate limiting:', error);
        throw new Error(`Failed to start rate limiting: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  async endRateLimiting(): Promise<any> {
    try {
      console.log('Ending rate limiting');
      const response = await axios.post('http://localhost:8004/end_rate_limiting', {}, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('End rate limiting response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorDetails = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        };
        console.error('Failed to end rate limiting:', errorDetails);
        throw new Error(`Failed to end rate limiting: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
      } else {
        console.error('Non-axios error ending rate limiting:', error);
        throw new Error(`Failed to end rate limiting: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  createTestEvent(eventType: string, additionalData: any = {}): any {
    return {
      payload: {
        connection_data: {
          org_id: this.credentials.organizationId,
          org_name: "Test Organization",
          key: `key=${this.credentials.apiKey}&token=${this.credentials.token}`,
          key_type: "oauth"
        },
        event_context: {
          callback_url: "http://localhost:8002/callback",
          dev_org: "test-org",
          dev_org_id: "test-org-id",
          dev_user: "test-user",
          dev_user_id: "test-user-id",
          external_sync_unit: "test-unit",
          external_sync_unit_id: "688725dad59c015ce052eecf",
          external_sync_unit_name: "Test Board",
          external_system: "trello",
          external_system_type: "trello",
          import_slug: "test-import",
          mode: "INITIAL",
          request_id: "test-request-id",
          snap_in_slug: "trello-snap-in",
          snap_in_version_id: "test-version-id",
          sync_run: "test-sync-run",
          sync_run_id: "test-sync-run-id",
          sync_tier: "standard",
          sync_unit: "test-sync-unit",
          sync_unit_id: "test-sync-unit-id",
          uuid: "test-uuid",
          worker_data_url: "http://localhost:8003/external-worker",
          ...additionalData.event_context
        },
        event_type: eventType,
        event_data: additionalData.event_data || {}
      },
      context: {
        dev_oid: "test-dev-oid",
        source_id: "test-source-id",
        snap_in_id: "test-snap-in-id",
        snap_in_version_id: "test-version-id",
        service_account_id: "test-service-account-id",
        secrets: {
          service_account_token: "test-token"
        }
      },
      execution_metadata: {
        request_id: "test-request-id",
        function_name: "extraction",
        event_type: eventType,
        devrev_endpoint: "http://localhost:8003"
      },
      input_data: {
        global_values: additionalData.global_values || {},
        event_sources: {}
      }
    };
  }

  async sendEventToSnapIn(event: any): Promise<any> {
    console.log('Sending event to snap-in:', JSON.stringify(event, null, 2));
    
    try {
      const response = await axios.post('http://localhost:8000/handle/sync', event, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      console.log('Received response from snap-in:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error sending event to snap-in:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        throw new Error(`Failed to send event to snap-in: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
      } else {
        console.error('Non-axios error sending event to snap-in:', error);
        throw new Error(`Failed to send event to snap-in: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  static getCredentialsFromEnv(): TestCredentials {
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const organizationId = process.env.TRELLO_ORGANIZATION_ID;

    if (!apiKey) {
      throw new Error('TRELLO_API_KEY environment variable is required');
    }
    if (!token) {
      throw new Error('TRELLO_TOKEN environment variable is required');
    }
    if (!organizationId) {
      throw new Error('TRELLO_ORGANIZATION_ID environment variable is required');
    }

    return { apiKey, token, organizationId };
  }
}