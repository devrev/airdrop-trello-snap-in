import express, { Express } from 'express';
import axios from 'axios';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';

export interface TestCredentials {
  apiKey: string;
  token: string;
  organizationId: string;
}

export function getTestCredentials(): TestCredentials {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const organizationId = process.env.TRELLO_ORGANIZATION_ID;

  if (!apiKey || !token || !organizationId) {
    throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  }

  return { apiKey, token, organizationId };
}

export interface CreateTestEventOptions {
  eventType: string;
  functionName: string;
  externalSyncUnitId?: string;
  mode?: string;
  requestId?: string;
  lastSuccessfulSync?: string;
}

export function createTestEvent(options: CreateTestEventOptions): any {
  const credentials = getTestCredentials();
  const requestId = options.requestId || `test-request-${Date.now()}`;
  const syncUnitId = options.externalSyncUnitId || '68e8befbf2f641caa9b1e275';
  
  return {
    context: {
      dev_oid: 'test-org',
      source_id: 'test-source',
      snap_in_id: 'test-snap-in',
      snap_in_version_id: 'test-version',
      service_account_id: 'test-service-account',
      secrets: { service_account_token: 'test-token' },
    },
    payload: {
      connection_data: {
        key: `key=${credentials.apiKey}&token=${credentials.token}`,
        org_id: credentials.organizationId,
      },
      event_context: {
        callback_url: 'http://localhost:8002/callback',
        dev_org: 'test-org',
        dev_org_id: 'test-org',
        dev_user: 'test-user',
        dev_user_id: 'test-user',
        external_sync_unit: syncUnitId,
        external_sync_unit_id: syncUnitId,
        external_sync_unit_name: 'Test Board',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'test-import',
        mode: options.mode || 'INITIAL',
        request_id: requestId,
        snap_in_slug: 'trello-snap-in',
        snap_in_version_id: 'test-version',
        sync_run: requestId,
        sync_run_id: requestId,
        sync_tier: 'standard',
        sync_unit: syncUnitId,
        sync_unit_id: syncUnitId,
        uuid: requestId,
        worker_data_url: 'http://localhost:8003/external-worker',
      },
      event_type: options.eventType,
    },
    execution_metadata: {
      request_id: requestId,
      function_name: options.functionName,
      event_type: options.eventType,
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
  };
}

export interface CallbackServerSetup {
  app: Express;
  server: Server;
  receivedEvents: any[];
  waitForEvent: (timeout?: number) => Promise<any>;
}

export function setupCallbackServer(port: number = 8002): Promise<CallbackServerSetup> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    const receivedEvents: any[] = [];
    let eventResolver: ((value: any) => void) | null = null;

    app.post('/callback', (req, res) => {
      receivedEvents.push(req.body);
      if (eventResolver) {
        eventResolver(req.body);
        eventResolver = null;
      }
      res.status(200).send({ status: 'received' });
    });

    const server = app.listen(port, () => {
      resolve({
        app,
        server,
        receivedEvents,
        waitForEvent: (timeout = 30000) => {
          return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              eventResolver = null;
              reject(new Error(`Timeout waiting for callback event after ${timeout}ms`));
            }, timeout);

            eventResolver = (event) => {
              clearTimeout(timer);
              resolve(event);
            };

            if (receivedEvents.length > 0) {
              clearTimeout(timer);
              resolve(receivedEvents[receivedEvents.length - 1]);
            }
          });
        },
      });
    });
  });
}

export async function invokeSnapInFunction(event: any): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', event, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
}

export function closeServer(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

export interface UpdateLastSuccessfulSyncOptions {
  syncUnitId: string;
  snapInVersionId: string;
  extendState: any;
}

export async function updateLastSuccessfulSync(options: UpdateLastSuccessfulSyncOptions): Promise<void> {
  const url = `http://localhost:8003/external-worker.update-last-successful-sync/${options.syncUnitId}`;
  
  try {
    const response = await axios.post(url, {
      snap_in_version_id: options.snapInVersionId,
      extend_state: options.extendState,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to update last successful sync. Status: ${response.status}, Response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to update last successful sync: ${error.message}. Response: ${JSON.stringify(error.response?.data)}`);
    }
    throw error;
  }
}

export interface UpdateTrelloCardOptions {
  cardId: string;
  name: string;
  apiKey: string;
  token: string;
}

export async function updateTrelloCard(options: UpdateTrelloCardOptions): Promise<void> {
  const url = `https://api.trello.com/1/cards/${options.cardId}`;
  
  try {
    const response = await axios.put(url, null, {
      params: {
        key: options.apiKey,
        token: options.token,
        name: options.name,
      },
      headers: { 'Accept': 'application/json' },
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to update Trello card. Status: ${response.status}, Response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to update Trello card: ${error.message}. Response: ${JSON.stringify(error.response?.data)}`);
    }
    throw error;
  }
}

export function generateUniqueCardName(): string {
  return `Card12-${uuidv4()}`;
}

export function loadTestEventFromJson(filePath: string): any {
  const fs = require('fs');
  const path = require('path');
  
  const fullPath = path.resolve(__dirname, filePath);
  const fileContent = fs.readFileSync(fullPath, 'utf-8');
  const event = JSON.parse(fileContent);
  
  const credentials = getTestCredentials();
  event.payload.connection_data.key = `key=${credentials.apiKey}&token=${credentials.token}`;
  event.payload.connection_data.org_id = credentials.organizationId;
  
  return event;
}