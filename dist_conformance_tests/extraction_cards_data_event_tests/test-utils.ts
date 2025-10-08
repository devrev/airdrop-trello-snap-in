import axios from 'axios';
import express from 'express';
import { Server } from 'http';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
}

export interface TestServers {
  callbackServer: Server;
  callbackUrl: string;
}

export function getTestEnvironment(): TestEnvironment {
  const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
  const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
  const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

  if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
    throw new Error(
      'Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID'
    );
  }

  return {
    TRELLO_API_KEY,
    TRELLO_TOKEN,
    TRELLO_ORGANIZATION_ID,
  };
}

export function setupCallbackServer(): Promise<TestServers> {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(express.json());

    // Callback endpoint for receiving events from the snap-in
    app.post('/callback', (req, res) => {
      console.log('Received callback:', JSON.stringify(req.body, null, 2));
      res.status(200).json({ received: true });
    });

    const server = app.listen(8002, (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          callbackServer: server,
          callbackUrl: 'http://localhost:8002/callback',
        });
      }
    });
  });
}

export function createBaseEvent(env: TestEnvironment, functionName: string, eventType: string) {
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
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-dev-user',
        dev_user_id: 'test-dev-user-id',
        external_sync_unit: '688725dad59c015ce052eecf',
        external_sync_unit_id: '688725dad59c015ce052eecf',
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
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: functionName,
      event_type: 'test-event-type',
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
  };
}

export async function sendEventToSnapIn(event: any): Promise<any> {
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', event, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `Snap-in server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
      );
    } else if (error.request) {
      throw new Error('No response from snap-in server. Is the server running on port 8000?');
    } else {
      throw new Error(`Request setup error: ${error.message}`);
    }
  }
}

export function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}