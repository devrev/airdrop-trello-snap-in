import express from 'express';
import { Server } from 'http';

export interface TestEvent {
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
}

export function createTestEvent(eventType: string): TestEvent {
  const requestId = `test-request-${Date.now()}`;
  
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
    execution_metadata: {
      request_id: requestId,
      function_name: 'data_extraction_check',
      event_type: 'airdrop_event',
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
    payload: {
      connection_data: {
        org_id: 'test-org-123',
        org_name: 'Test Organization',
        key: 'test-api-key',
        key_type: 'api_key',
      },
      event_context: {
        callback_url: 'http://localhost:8002/callback',
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org',
        dev_user: 'test-user',
        dev_user_id: 'test-user',
        external_sync_unit: 'test-sync-unit',
        external_sync_unit_id: 'test-sync-unit',
        external_sync_unit_name: 'Test Sync Unit',
        external_system: 'test-system',
        external_system_type: 'test',
        import_slug: 'test-import',
        mode: 'INITIAL',
        request_id: requestId,
        snap_in_slug: 'test-snap-in',
        snap_in_version_id: 'test-version',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run',
        sync_tier: 'test-tier',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit',
        uuid: `test-uuid-${Date.now()}`,
        worker_data_url: 'http://localhost:8003/external-worker',
      },
      event_type: eventType,
    },
  };
}

export interface CallbackServerSetup {
  server: Server;
  port: number;
  receivedEvents: any[];
  waitForEvent: (timeout?: number) => Promise<any>;
}

export function setupCallbackServer(): Promise<CallbackServerSetup> {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(express.json());
    
    const receivedEvents: any[] = [];
    let eventResolvers: Array<(event: any) => void> = [];
    
    app.post('/callback', (req, res) => {
      const event = req.body;
      receivedEvents.push(event);
      
      // Resolve any waiting promises
      eventResolvers.forEach(resolver => resolver(event));
      eventResolvers = [];
      
      res.status(200).json({ status: 'received' });
    });
    
    const server = app.listen(8002, (err?: Error) => {
      if (err) {
        reject(new Error(`Failed to start callback server on port 8002: ${err.message}`));
        return;
      }
      
      const waitForEvent = (timeout = 5000): Promise<any> => {
        return new Promise((resolve, reject) => {
          if (receivedEvents.length > 0) {
            resolve(receivedEvents[receivedEvents.length - 1]);
            return;
          }
          
          const timeoutId = setTimeout(() => {
            const index = eventResolvers.indexOf(resolve);
            if (index > -1) {
              eventResolvers.splice(index, 1);
            }
            reject(new Error(`Timeout waiting for callback event after ${timeout}ms. Received events: ${receivedEvents.length}`));
          }, timeout);
          
          const wrappedResolve = (event: any) => {
            clearTimeout(timeoutId);
            resolve(event);
          };
          
          eventResolvers.push(wrappedResolve);
        });
      };
      
      resolve({
        server,
        port: 8002,
        receivedEvents,
        waitForEvent,
      });
    });
  });
}

export async function sendEventToSnapIn(event: TestEvent): Promise<any> {
  const axios = require('axios');
  
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', event, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to send event to snap-in server: ${error.message}. Event: ${JSON.stringify(event, null, 2)}`);
  }
}