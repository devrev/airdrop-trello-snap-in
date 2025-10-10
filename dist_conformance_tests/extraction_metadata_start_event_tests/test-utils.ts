import axios from 'axios';
import express from 'express';
import { Server } from 'http';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
}

export interface CallbackServerSetup {
  server: Server;
  port: number;
  receivedRequests: any[];
}

export function getTestEnvironment(): TestEnvironment {
  const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
  const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
  const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

  if (!TRELLO_API_KEY) {
    throw new Error('TRELLO_API_KEY environment variable is required');
  }
  if (!TRELLO_TOKEN) {
    throw new Error('TRELLO_TOKEN environment variable is required');
  }
  if (!TRELLO_ORGANIZATION_ID) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is required');
  }

  return {
    TRELLO_API_KEY,
    TRELLO_TOKEN,
    TRELLO_ORGANIZATION_ID
  };
}

export function setupCallbackServer(): Promise<CallbackServerSetup> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());
    
    const receivedRequests: any[] = [];
    
    app.post('*', (req, res) => {
      receivedRequests.push({
        path: req.path,
        body: req.body,
        headers: req.headers,
        timestamp: new Date().toISOString()
      });
      res.status(200).json({ received: true });
    });

    const server = app.listen(8002, () => {
      resolve({
        server,
        port: 8002,
        receivedRequests
      });
    });
  });
}

export function createMetadataExtractionEvent(env: TestEnvironment) {
  return {
    payload: {
      connection_data: {
        org_id: env.TRELLO_ORGANIZATION_ID,
        org_name: "Test Organization",
        key: `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`,
        key_type: "oauth"
      },
      event_context: {
        callback_url: "http://localhost:8002/callback",
        dev_org: "test-org",
        dev_org_id: "test-org-id",
        dev_user: "test-user",
        dev_user_id: "test-user-id",
        external_sync_unit: "test-board",
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
        sync_tier: "test-tier",
        sync_unit: "test-sync-unit",
        sync_unit_id: "test-sync-unit-id",
        uuid: "test-uuid",
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_type: "EXTRACTION_METADATA_START"
    },
    context: {
      dev_oid: "test-dev-oid",
      source_id: "test-source-id",
      snap_in_id: "test-snap-in-id",
      snap_in_version_id: "test-snap-in-version-id",
      service_account_id: "test-service-account-id",
      secrets: {
        service_account_token: "test-service-account-token"
      }
    },
    execution_metadata: {
      request_id: "test-request-id",
      function_name: "extraction",
      event_type: "EXTRACTION_METADATA_START",
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

export async function sendEventToSnapIn(event: any): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', event, {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });
  return response.data;
}

export function closeCallbackServer(setup: CallbackServerSetup): Promise<void> {
  return new Promise((resolve) => {
    setup.server.close(() => {
      resolve();
    });
  });
}