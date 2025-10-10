import express from 'express';
import { Request, Response } from 'express';
import { Server } from 'http';

export interface TestEnvironment {
  trelloApiKey: string;
  trelloToken: string;
  trelloOrganizationId: string;
}

export function getTestEnvironment(): TestEnvironment {
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

export function createCallbackServer(): Promise<{ server: Server; port: number }> {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(express.json());

    const callbacks: any[] = [];
    
    app.post('/callback', (req: Request, res: Response) => {
      callbacks.push(req.body);
      res.status(200).json({ received: true });
    });

    app.get('/callbacks', (req: Request, res: Response) => {
      res.json(callbacks);
    });

    const server = app.listen(8002, (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve({ server, port: 8002 });
      }
    });
  });
}

export interface GlobalValues {
  limit?: string;
  before?: string;
}

export function createBaseEvent(env: TestEnvironment, globalValues: GlobalValues = {}) {
  return {
    payload: {
      connection_data: {
        org_id: env.trelloOrganizationId,
        org_name: 'Test Organization',
        key: `key=${env.trelloApiKey}&token=${env.trelloToken}`,
        key_type: 'oauth',
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
        request_id: 'test-request-id',
        snap_in_slug: 'trello-snap-in',
        snap_in_version_id: 'v1.0.0',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'standard',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'http://localhost:8003/external-worker',
      },
      event_type: 'TEST_EVENT',
      event_data: {},
    },
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'v1.0.0',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token',
      },
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: 'fetch_board_cards',
      event_type: 'TEST_EVENT',
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: globalValues,
      event_sources: {},
    },
  };
}