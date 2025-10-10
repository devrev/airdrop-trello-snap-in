import axios from 'axios';
import * as http from 'http';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
}

export function getTestEnvironment(): TestEnvironment {
  const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
  const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
  const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

  if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
    throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  }

  return {
    TRELLO_API_KEY,
    TRELLO_TOKEN,
    TRELLO_ORGANIZATION_ID
  };
}

export function createCallbackServer(): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    });

    server.listen(8002, () => {
      resolve({ server, port: 8002 });
    });
  });
}

export function createCallbackServerWithCapture(): Promise<{ server: http.Server; port: number; events: any[] }> {
  const capturedEvents: any[] = [];
  
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const event = JSON.parse(body);
            console.log('Callback server received event:', JSON.stringify(event, null, 2));
            capturedEvents.push(event);
          } catch (error) {
            console.error('Failed to parse callback event:', error);
          }
        });
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    });

    server.listen(8002, () => {
      console.log('Callback server with capture started on port 8002');
      resolve({ server, port: 8002, events: capturedEvents });
    });
  });
}

export function createBaseExtractionEvent(env: TestEnvironment, eventType: string): any {
  return {
    context: {
      dev_oid: "test-dev-oid",
      source_id: "test-source-id",
      snap_in_id: "test-snap-in-id",
      snap_in_version_id: "test-snap-in-version-id",
      service_account_id: "test-service-account-id",
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
        dev_org_id: "test-dev-org-id",
        dev_user: "test-dev-user",
        dev_user_id: "test-dev-user-id",
        external_sync_unit: "688725dad59c015ce052eecf",
        external_sync_unit_id: "688725dad59c015ce052eecf",
        external_sync_unit_name: "Test Board",
        external_system: "trello",
        external_system_type: "trello",
        import_slug: "test-import-slug",
        mode: "INITIAL",
        request_id: "test-request-id",
        snap_in_slug: "trello-snap-in",
        snap_in_version_id: "test-snap-in-version-id",
        sync_run: "test-sync-run",
        sync_run_id: "test-sync-run-id",
        sync_tier: "test-sync-tier",
        sync_unit: "test-sync-unit",
        sync_unit_id: "test-sync-unit-id",
        uuid: "test-uuid",
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_type: eventType,
      event_data: {}
    },
    execution_metadata: {
      request_id: "test-request-id",
      function_name: "extraction",
      event_type: "extraction",
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

export async function callSnapInFunction(functionName: string, event: any): Promise<any> {
  const eventWithFunction = {
    ...event,
    execution_metadata: {
      ...event.execution_metadata,
      function_name: functionName
    }
  };

  const response = await axios.post('http://localhost:8000/handle/sync', eventWithFunction);
  return response.data;
}