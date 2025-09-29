import express from 'express';
import { Server } from 'http';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
}

export interface CallbackServerResponse {
  method: string;
  url: string;
  body: any;
  timestamp: number;
}

export class CallbackServer {
  private app: express.Application;
  private server: Server | null = null;
  private requests: CallbackServerResponse[] = [];

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.all('*', (req, res) => {
      const response: CallbackServerResponse = {
        method: req.method,
        url: req.url,
        body: req.body,
        timestamp: Date.now()
      };
      this.requests.push(response);
      res.status(200).json({ received: true });
    });
  }

  async start(port: number = 8002): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getRequests(): CallbackServerResponse[] {
    return [...this.requests];
  }

  clearRequests(): void {
    this.requests = [];
  }
}

export function getTestEnvironment(): TestEnvironment {
  const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
  const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
  const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

  if (!TRELLO_API_KEY) {
    throw new Error('TRELLO_API_KEY environment variable is required for tests');
  }
  if (!TRELLO_TOKEN) {
    throw new Error('TRELLO_TOKEN environment variable is required for tests');
  }
  if (!TRELLO_ORGANIZATION_ID) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is required for tests');
  }

  return {
    TRELLO_API_KEY,
    TRELLO_TOKEN,
    TRELLO_ORGANIZATION_ID
  };
}

export async function sendEventToSnapIn(event: any): Promise<any> {
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', event, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to send event to snap-in server: ${error.message}`);
  }
}

export function createBaseEvent(env: TestEnvironment): any {
  return {
    context: {
      dev_oid: "test-dev-org",
      source_id: "test-source",
      snap_in_id: "test-snap-in",
      snap_in_version_id: "test-version",
      service_account_id: "test-service-account",
      secrets: {
        service_account_token: "test-token"
      }
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
        dev_org_id: "test-dev-org",
        dev_user: "test-user",
        dev_user_id: "test-user",
        external_sync_unit: "688725dad59c015ce052eecf",
        external_sync_unit_id: "688725dad59c015ce052eecf",
        external_sync_unit_name: "Test Board",
        external_system: "trello",
        external_system_type: "trello",
        import_slug: "test-import",
        mode: "INITIAL",
        request_id: "test-request-id",
        snap_in_slug: "trello-snap-in",
        snap_in_version_id: "test-version",
        sync_run: "test-sync-run",
        sync_run_id: "test-sync-run",
        sync_tier: "test-tier",
        sync_unit: "test-sync-unit",
        sync_unit_id: "test-sync-unit",
        uuid: "test-uuid",
        worker_data_url: "http://localhost:8003/external-worker"
      }
    }
  };
}

export async function updateLastSuccessfulSync(syncUnitId: string, payload: any): Promise<void> {
  try {
    const response = await axios.post(
      `http://localhost:8003/external-worker.update-last-successful-sync/${syncUnitId}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`DevRev API returned status ${response.status}: ${JSON.stringify(response.data)}`);
    }
  } catch (error: any) {
    if (error.response) {
      throw new Error(`DevRev API request failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error(`DevRev API request failed - no response received: ${error.message}`);
    } else {
      throw new Error(`DevRev API request setup failed: ${error.message}`);
    }
  }
}

export async function updateTrelloCard(cardId: string, cardName: string, env: TestEnvironment): Promise<any> {
  try {
    const response = await axios.put(
      `https://api.trello.com/1/cards/${cardId}`,
      null,
      {
        params: {
          key: env.TRELLO_API_KEY,
          token: env.TRELLO_TOKEN,
          name: cardName
        },
        headers: {
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`Trello API returned status ${response.status}: ${JSON.stringify(response.data)}`);
    }
    
    return response;
  } catch (error: any) {
    if (error.response) {
      throw new Error(`Trello API request failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error(`Trello API request failed - no response received: ${error.message}`);
    } else {
      throw new Error(`Trello API request setup failed: ${error.message}`);
    }
  }
}

export function generateUUID(): string {
  return uuidv4();
}

export function validateCallbackResponse(callbackRequests: CallbackServerResponse[]): any {
  // Find the callback request with EXTRACTION_DATA_DONE event
  const dataExtractionDoneRequest = callbackRequests.find(request => 
    request.body && 
    request.body.event_type === 'EXTRACTION_DATA_DONE'
  );

  if (!dataExtractionDoneRequest) {
    const eventTypes = callbackRequests.map(req => req.body?.event_type || 'unknown').join(', ');
    throw new Error(`Expected to receive a callback with event_type 'EXTRACTION_DATA_DONE', but received: [${eventTypes}]`);
  }

  // Validate that we received exactly one EXTRACTION_DATA_DONE event
  const dataExtractionDoneRequests = callbackRequests.filter(request => 
    request.body && 
    request.body.event_type === 'EXTRACTION_DATA_DONE'
  );

  if (dataExtractionDoneRequests.length !== 1) {
    throw new Error(`Expected exactly one callback with event_type 'EXTRACTION_DATA_DONE', but received ${dataExtractionDoneRequests.length}`);
  }

  const eventData = dataExtractionDoneRequest.body.event_data;
  if (!eventData) {
    throw new Error('Callback request body is missing event_data field');
  }

  const artifactArray = eventData.artifacts;
  if (!artifactArray) {
    throw new Error('Callback event_data is missing artifacts field');
  }

  if (!Array.isArray(artifactArray)) {
    throw new Error(`Expected artifacts to be an array, but got: ${typeof artifactArray}`);
  }

  if (artifactArray.length === 0) {
    throw new Error('Expected artifacts array to not be empty, but it is empty');
  }

  // Find cards artifact
  const cardsArtifact = artifactArray.find(artifact => artifact.item_type === 'cards');
  if (!cardsArtifact) {
    const itemTypes = artifactArray.map(artifact => artifact.item_type || 'unknown').join(', ');
    throw new Error(`Expected to find an artifact with item_type 'cards', but found item_types: [${itemTypes}]`);
  }

  // Validate cards artifact item_count
  if (cardsArtifact.item_count !== 1) {
    throw new Error(`Expected cards artifact to have item_count=1, but got item_count=${cardsArtifact.item_count}`);
  }

  // Validate that there is no attachments artifact
  const attachmentsArtifact = artifactArray.find(artifact => artifact.item_type === 'attachments');
  if (attachmentsArtifact) {
    throw new Error('Expected no artifact with item_type "attachments", but found one. This indicates attachments data was incorrectly pushed to DevRev servers.');
  }

  // Validate that there is no users artifact
  const usersArtifact = artifactArray.find(artifact => artifact.item_type === 'users');
  if (usersArtifact) {
    throw new Error('Expected no artifact with item_type "users", but found one. This indicates users data was incorrectly pushed to DevRev servers.');
  }

  return {
    success: true,
    cardsArtifact,
    totalArtifacts: artifactArray.length
  };
}

export function validateIncrementalCallbackResponse(callbackRequests: CallbackServerResponse[]): any {
  // Find the callback request with EXTRACTION_DATA_DONE event
  const dataExtractionDoneRequest = callbackRequests.find(request => 
    request.body && 
    request.body.event_type === 'EXTRACTION_DATA_DONE'
  );

  if (!dataExtractionDoneRequest) {
    const eventTypes = callbackRequests.map(req => req.body?.event_type || 'unknown').join(', ');
    throw new Error(`Expected to receive a callback with event_type 'EXTRACTION_DATA_DONE', but received: [${eventTypes}]`);
  }

  // Validate that we received exactly one EXTRACTION_DATA_DONE event
  const dataExtractionDoneRequests = callbackRequests.filter(request => 
    request.body && 
    request.body.event_type === 'EXTRACTION_DATA_DONE'
  );

  if (dataExtractionDoneRequests.length !== 1) {
    throw new Error(`Expected exactly one callback with event_type 'EXTRACTION_DATA_DONE', but received ${dataExtractionDoneRequests.length}`);
  }

  const eventData = dataExtractionDoneRequest.body.event_data;
  if (!eventData) {
    throw new Error('Callback request body is missing event_data field');
  }

  const artifactArray = eventData.artifacts;
  if (!artifactArray) {
    throw new Error('Callback event_data is missing artifacts field');
  }

  if (!Array.isArray(artifactArray)) {
    throw new Error(`Expected artifacts to be an array, but got: ${typeof artifactArray}`);
  }

  if (artifactArray.length === 0) {
    throw new Error('Expected artifacts array to not be empty, but it is empty');
  }

  // Find cards artifact
  const cardsArtifact = artifactArray.find(artifact => artifact.item_type === 'cards');
  if (!cardsArtifact) {
    const itemTypes = artifactArray.map(artifact => artifact.item_type || 'unknown').join(', ');
    throw new Error(`Expected to find an artifact with item_type 'cards', but found item_types: [${itemTypes}]`);
  }

  // Validate cards artifact item_count (should be 1 for incremental mode)
  if (cardsArtifact.item_count !== 1) {
    throw new Error(`Expected cards artifact to have item_count=1, but got item_count=${cardsArtifact.item_count}`);
  }

  // Find attachments artifact
  const attachmentsArtifact = artifactArray.find(artifact => artifact.item_type === 'attachments');
  if (!attachmentsArtifact) {
    const itemTypes = artifactArray.map(artifact => artifact.item_type || 'unknown').join(', ');
    throw new Error(`Expected to find an artifact with item_type 'attachments', but found item_types: [${itemTypes}]`);
  }

  // Validate attachments artifact item_count (should be 2 for incremental mode)
  if (attachmentsArtifact.item_count !== 2) {
    throw new Error(`Expected attachments artifact to have item_count=2, but got item_count=${attachmentsArtifact.item_count}`);
  }

  // Validate that there is no users artifact (users should not be pushed in incremental mode)
  const usersArtifact = artifactArray.find(artifact => artifact.item_type === 'users');
  if (usersArtifact) {
    throw new Error('Expected no artifact with item_type "users", but found one. This indicates users data was incorrectly pushed to DevRev servers in incremental mode.');
  }

  return {
    success: true,
    cardsArtifact,
    attachmentsArtifact,
    totalArtifacts: artifactArray.length
  };
}