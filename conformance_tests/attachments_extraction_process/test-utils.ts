import axios, { AxiosInstance, AxiosResponse } from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';

// Environment variables
export const TRELLO_API_KEY = process.env.TRELLO_API_KEY || '';
export const TRELLO_TOKEN = process.env.TRELLO_TOKEN || '';
export const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID || '';

// Test board ID
export const TEST_BOARD_ID = '6752eb962a64828e59a35396';

// Server URLs
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_URL = 'http://localhost:8002';
export const DEVREV_SERVER_URL = 'http://localhost:8003';
export const WORKER_DATA_URL = `${DEVREV_SERVER_URL}/external-worker`;

// Create HTTP client
export const createClient = (): AxiosInstance => {
  return axios.create({
    validateStatus: () => true, // Don't throw on non-2xx responses
  });
};

// Create a basic event payload
export const createEventPayload = (eventType: string, additionalData: Record<string, any> = {}) => {
  return {
    context: {
      dev_oid: 'dev_o_123',
      source_id: 'source_123',
      snap_in_id: 'snap_in_123',
      snap_in_version_id: 'snap_in_version_123',
      service_account_id: 'service_account_123',
      secrets: {
        service_account_token: 'service_token_123',
        actor_session_token: 'actor_token_123'
      }
    },
    execution_metadata: {
      request_id: `req_${Date.now()}`,
      function_name: 'extraction',
      event_type: 'event.function.invoke',
      devrev_endpoint: DEVREV_SERVER_URL
    },
    input_data: {
      global_values: {},
      event_sources: {}
    },
    payload: {
      connection_data: {
        org_id: TRELLO_ORGANIZATION_ID,
        org_name: 'Test Organization',
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
        key_type: 'oauth'
      },
      event_context: {
        callback_url: CALLBACK_SERVER_URL,
        dev_org: 'dev_o_123',
        dev_org_id: 'dev_o_123',
        dev_user: 'dev_u_123',
        dev_user_id: 'dev_u_123',
        external_sync_unit: TEST_BOARD_ID,
        external_sync_unit_id: TEST_BOARD_ID,
        external_sync_unit_name: 'Test Board',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'import_123',
        mode: 'INITIAL',
        request_id: `req_${Date.now()}`,
        snap_in_slug: 'trello',
        snap_in_version_id: 'snap_in_version_123',
        sync_run: 'sync_run_123',
        sync_run_id: 'sync_run_123',
        sync_tier: 'tier_1',
        sync_unit: 'sync_unit_123',
        sync_unit_id: 'sync_unit_123',
        uuid: `uuid_${Date.now()}`,
        worker_data_url: WORKER_DATA_URL
      },
      event_type: eventType,
      event_data: {},
      ...additionalData
    }
  };
};

// Callback server for receiving events
export class CallbackServer {
  private app = express();
  private server: Server | null = null;
  private events: any[] = [];

  constructor(private port = 8002) {
    this.app.use(bodyParser.json());
    this.app.post('*', (req, res) => {
      this.events.push(req.body);
      res.status(200).send({ success: true });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Callback server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getEvents(): any[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }
}

// Send event to snap-in server
export const sendEventToSnapIn = async (
  eventPayload: any
): Promise<AxiosResponse> => {
  const client = createClient();
  return client.post(SNAP_IN_SERVER_URL, eventPayload);
};

// Validate environment variables
export const validateEnvironment = (): void => {
  if (!TRELLO_API_KEY) {
    throw new Error('TRELLO_API_KEY environment variable is required');
  }
  if (!TRELLO_TOKEN) {
    throw new Error('TRELLO_TOKEN environment variable is required');
  }
  if (!TRELLO_ORGANIZATION_ID) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is required');
  }
};