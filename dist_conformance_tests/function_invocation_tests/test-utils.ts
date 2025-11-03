import axios from 'axios';
import express from 'express';
import { Server } from 'http';

export interface TestEvent {
  payload: any;
  context: {
    dev_oid: string;
    source_id: string;
    snap_in_id: string;
    snap_in_version_id: string;
    service_account_id: string;
    secrets: Record<string, string>;
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
  private app = express();
  private server: Server | null = null;
  private receivedCallbacks: any[] = [];

  constructor() {
    this.app.use(express.json());
    this.app.post('*', (req, res) => {
      this.receivedCallbacks.push({
        path: req.path,
        body: req.body,
        headers: req.headers,
        timestamp: new Date().toISOString()
      });
      res.status(200).json({ status: 'received' });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(8002, () => {
        console.log('Callback server started on port 8002');
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Callback server stopped');
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
}

export function createBaseEvent(functionName: string, eventType: string): TestEvent {
  return {
    payload: {
      connection_data: {
        org_id: 'test-org-123',
        org_name: 'Test Organization',
        key: 'test-api-key-456',
        key_type: 'api_key'
      },
      event_context: {
        callback_url: 'http://localhost:8002/callback',
        dev_org: 'test-org-123',
        dev_org_id: 'test-org-123',
        dev_user: 'test-user-789',
        dev_user_id: 'test-user-789',
        external_sync_unit: 'test-sync-unit',
        external_sync_unit_id: 'test-sync-unit-id',
        external_sync_unit_name: 'Test Sync Unit',
        external_system: 'test-system',
        external_system_type: 'test-type',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: 'test-request-123',
        snap_in_slug: 'test-snap-in',
        snap_in_version_id: 'test-version-456',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'test-tier',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit-id',
        uuid: 'test-uuid-789',
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_type: eventType
    },
    context: {
      dev_oid: 'test-org-123',
      source_id: 'test-source-456',
      snap_in_id: 'test-snap-in-789',
      snap_in_version_id: 'test-version-456',
      service_account_id: 'test-service-account',
      secrets: {
        service_account_token: 'test-token-123'
      }
    },
    execution_metadata: {
      request_id: 'test-request-123',
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
      throw new Error(`HTTP ${error.response?.status}: ${error.response?.data || error.message}`);
    }
    throw error;
  }
}