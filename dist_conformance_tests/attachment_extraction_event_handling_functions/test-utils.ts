import express from 'express';
import axios from 'axios';
import { Server } from 'http';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
}

export interface CallbackEvent {
  event_type: string;
  data?: any;
  timestamp: number;
}

export class CallbackServer {
  private app = express();
  private server: Server | null = null;
  private events: CallbackEvent[] = [];

  constructor() {
    this.app.use(express.json());
    this.app.post('/callback', (req, res) => {
      this.events.push({
        event_type: req.body.event_type || 'unknown',
        data: req.body.event_data,
        timestamp: Date.now()
      });
      res.status(200).json({ received: true });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(8002, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => resolve());
      });
    }
  }

  getEvents(): CallbackEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }

  async waitForEvent(eventType: string, timeoutMs: number = 30000): Promise<CallbackEvent | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const event = this.events.find(e => e.event_type === eventType);
      if (event) {
        return event;
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return null;
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

export function createEventFromJson(jsonTemplate: any, env: TestEnvironment): any {
  // Deep clone the JSON template
  const event = JSON.parse(JSON.stringify(jsonTemplate));
  
  // Replace placeholders with actual credentials
  if (event.payload?.connection_data?.key) {
    event.payload.connection_data.key = event.payload.connection_data.key
      .replace('<TRELLO_API_KEY>', env.TRELLO_API_KEY)
      .replace('<TRELLO_TOKEN>', env.TRELLO_TOKEN);
  }
  
  if (event.payload?.connection_data?.org_id) {
    event.payload.connection_data.org_id = event.payload.connection_data.org_id
      .replace('<TRELLO_ORGANIZATION_ID>', env.TRELLO_ORGANIZATION_ID);
  }
  
  return event;
}

export function createAttachmentExtractionEvent(eventType: string, env: TestEnvironment) {
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
        sync_tier: "standard",
        sync_unit: "test-sync-unit",
        sync_unit_id: "test-sync-unit",
        uuid: "test-uuid",
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_type: eventType,
      event_data: {}
    },
    execution_metadata: {
      request_id: "test-request-id",
      function_name: "extraction",
      event_type: eventType,
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

export async function callSnapInServer(event: any): Promise<any> {
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', event, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Snap-in server request failed: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
    }
    throw error;
  }
}

export async function checkArtifactUpload(artifactId: string): Promise<number> {
  try {
    const response = await axios.get(`http://localhost:8003/is_uploaded/${artifactId}`, {
      timeout: 10000
    });
    return response.status;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Artifact upload check failed: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
    }
    throw error;
  }
}

export async function startRateLimiting(testName: string): Promise<void> {
  try {
    const response = await axios.post('http://localhost:8004/start_rate_limiting', {
      test_name: testName
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, but got: ${response.status} ${response.statusText} - ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Rate limiting start request failed: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
    }
    throw error;
  }
}

export async function endRateLimiting(): Promise<void> {
  try {
    const response = await axios.post('http://localhost:8004/end_rate_limiting', {}, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, but got: ${response.status} ${response.statusText} - ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Rate limiting end request failed: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
    }
    throw error;
  }
}