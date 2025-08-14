import axios, { AxiosInstance, AxiosResponse } from 'axios';
import express from 'express';
import { Server } from 'http';

// Types for the test environment
export interface EventContext {
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
}

export interface FunctionInput {
  payload: {
    connection_data: {
      org_id: string;
      org_name: string;
      key: string;
      key_type: string;
    };
    event_context: EventContext;
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
      actor_session_token?: string;
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

// Define the expected response structure from the snap-in server
export interface FunctionResponse {
  function_result: {
    status: string;
    message: string;
  };
  error?: {
    err_type: string;
    err_msg: string;
  } | {
    error: unknown;
  };
}

// HTTP client for making requests to the snap-in server
export class HttpClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      },
    });
  }

  async post<T>(path: string, data: any): Promise<AxiosResponse<T>> {
    return this.client.post<T>(path, data);
  }
  
  // Add a method that returns the raw response data without type constraints
  async postRaw(path: string, data: any): Promise<AxiosResponse<any>> {
    return this.client.post(path, data, {
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true // Accept any status code
    });
  }
}

// Callback server to receive events from the snap-in
export class CallbackServer {
  private app = express();
  private server: Server | null = null;
  private events: any[] = [];
  private port: number;

  constructor(port: number) {
    this.port = port;
    this.app.use(express.json());
    
    this.app.post('/callback', (req, res) => {
      console.log('Received callback:', JSON.stringify(req.body));
      this.events.push(req.body);
      res.status(200).send({ status: 'ok' });
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
          if (err) {
            reject(err);
          } else {
            this.server = null;
            resolve();
          }
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

// Create a mock event for testing
export function createMockEvent(eventType: string): FunctionInput {
  const callbackUrl = 'http://localhost:8002/callback';
  
  return {
    payload: {
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'Test Organization',
        key: 'test-key',
        key_type: 'api_key',
      },
      event_context: {
        callback_url: callbackUrl,
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-dev-user',
        dev_user_id: 'test-dev-user-id',
        external_sync_unit: 'test-external-sync-unit',
        external_sync_unit_id: 'test-external-sync-unit-id',
        external_sync_unit_name: 'Test External Sync Unit',
        external_system: 'test-external-system',
        external_system_type: 'test-external-system-type',
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
    },
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
      function_name: 'data_extraction_check',
      event_type: 'test-event-type',
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
  };
}