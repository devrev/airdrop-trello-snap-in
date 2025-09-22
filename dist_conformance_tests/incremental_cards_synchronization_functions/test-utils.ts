import express from 'express';
import axios from 'axios';
import { Server } from 'http';

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
}

export interface CallbackServerSetup {
  server: Server;
  port: number;
  receivedEvents: any[];
  cleanup: () => Promise<void>;
}

export interface TestEventPayload {
  payload: {
    connection_data: {
      org_id: string;
      org_name: string;
      key: string;
      key_type: string;
    };
    event_context: {
      callback_url: string;
      dev_oid?: string;
      dev_org: string;
      dev_org_id: string;
      dev_user: string;
      dev_user_id: string;
      external_sync_unit: string;
      external_sync_unit_id: string;
      external_sync_unit_name: string;
      external_system: string;
      external_system_type: string;
      extract_from?: string;
      import_slug: string;
      initial_sync_scope?: string;
      mode: string;
      request_id: string;
      reset_extraction?: boolean;
      snap_in_slug: string;
      snap_in_version_id: string;
      sync_run: string;
      sync_run_id: string;
      sync_tier: string;
      sync_unit: string;
      sync_unit_id: string;
      uuid: string;
      dev_uid?: string;
      worker_data_url: string;
    };
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

export interface UpdateStatePayload {
  snap_in_version_id: string;
  extend_state: {
    users: { completed: boolean };
    cards: { completed: boolean };
    attachments: { completed: boolean };
  };
}

export interface CallbackEventValidation {
  expectedEventType: string;
  expectedCardsCount: number;
  expectedAttachmentsCount: number;
  shouldHaveUsers: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Reads and validates required environment variables
 */
export function getTestEnvironment(): TestEnvironment {
  const env = {
    TRELLO_API_KEY: process.env.TRELLO_API_KEY,
    TRELLO_TOKEN: process.env.TRELLO_TOKEN,
    TRELLO_ORGANIZATION_ID: process.env.TRELLO_ORGANIZATION_ID,
  };

  const missing = Object.entries(env)
    .filter(([_, value]) => !value)
    .map(([key, _]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return env as TestEnvironment;
}

/**
 * Sets up a callback server for testing
 */
export async function setupCallbackServer(): Promise<CallbackServerSetup> {
  const app = express();
  app.use(express.json());
  
  const receivedEvents: any[] = [];
  
  app.post('/callback', (req, res) => {
    receivedEvents.push({
      timestamp: new Date().toISOString(),
      body: req.body,
      headers: req.headers
    });
    res.status(200).json({ received: true });
  });

  const port = 8002;
  const server = app.listen(port);

  const cleanup = async (): Promise<void> => {
    return new Promise((resolve) => {
      server.close(() => resolve());
    });
  };

  return {
    server,
    port,
    receivedEvents,
    cleanup
  };
}

/**
 * Creates a base test event payload
 */
export function createBaseTestEvent(env: TestEnvironment, eventType: string, mode: string = 'INITIAL'): TestEventPayload {
  const requestId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
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
        external_sync_unit: "688725dad59c015ce052eecf",
        external_sync_unit_id: "688725dad59c015ce052eecf",
        external_sync_unit_name: "Test Board",
        external_system: "trello",
        external_system_type: "trello",
        import_slug: "test-import",
        mode: mode,
        request_id: requestId,
        snap_in_slug: "trello-snap-in",
        snap_in_version_id: "v1.0.0",
        sync_run: "test-sync-run",
        sync_run_id: "test-sync-run-id",
        sync_tier: "standard",
        sync_unit: "test-sync-unit",
        sync_unit_id: "test-sync-unit-id",
        uuid: requestId,
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_type: eventType,
      event_data: {}
    },
    context: {
      dev_oid: "test-dev-org",
      source_id: "test-source",
      snap_in_id: "test-snap-in",
      snap_in_version_id: "v1.0.0",
      service_account_id: "test-service-account",
      secrets: {
        service_account_token: "test-token"
      }
    },
    execution_metadata: {
      request_id: requestId,
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

/**
 * Creates test event from data_extraction_incremental_test.json template
 */
export function createIncrementalTestEvent(env: TestEnvironment): TestEventPayload {
  // Based on data_extraction_incremental_test.json structure
  return {
    payload: {
      connection_data: {
        key: `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`,
        key_type: "",
        org_id: env.TRELLO_ORGANIZATION_ID,
        org_name: "Trello Workspace"
      },
      event_context: {
        callback_url: "http://localhost:8002/callback",
        dev_oid: "DEV-36shCCBEAA",
        dev_org: "DEV-36shCCBEAA",
        dev_org_id: "DEV-36shCCBEAA",
        dev_uid: "DEVU-1",
        dev_user: "DEVU-1",
        dev_user_id: "DEVU-1",
        external_sync_unit: "688725dad59c015ce052eecf",
        external_sync_unit_id: "688725dad59c015ce052eecf",
        external_sync_unit_name: "SaaS connectors",
        external_system: env.TRELLO_ORGANIZATION_ID,
        external_system_type: "ADaaS",
        import_slug: "trello-snapin-devrev",
        mode: "INCREMENTAL",
        request_id: "63c6f1c6-eabe-452f-a694-7f23a8f5c3cc",
        snap_in_slug: "trello-snapin-devrev",
        snap_in_version_id: "don:integration:dvrv-eu-1:devo/36shCCBEAA:snap_in_package/b66dda95-cf9e-48be-918c-8439ecdd548e:snap_in_version/50d4660e-dad9-41d6-9169-8a7e96b2d7fa",
        sync_run: "cbbe2419-1f86-4737-aa78-6bb7118ce52c",
        sync_run_id: "cbbe2419-1f86-4737-aa78-6bb7118ce52c",
        sync_tier: "sync_tier_2",
        sync_unit: "don:integration:dvrv-eu-1:devo/36shCCBEAA:external_system_type/ADAAS:external_system/" + env.TRELLO_ORGANIZATION_ID + ":sync_unit/984c894e-71e5-4e94-b484-40b839c9a916",
        sync_unit_id: "984c894e-71e5-4e94-b484-40b839c9a916",
        uuid: "63c6f1c6-eabe-452f-a694-7f23a8f5c3cc",
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_type: "EXTRACTION_DATA_START"
    },
    context: {
      dev_oid: "don:identity:dvrv-eu-1:devo/36shCCBEAA",
      source_id: "",
      snap_in_id: "don:integration:dvrv-eu-1:devo/36shCCBEAA:snap_in/03a783b1-5d9f-4af8-b958-e401f2022439",
      snap_in_version_id: "don:integration:dvrv-eu-1:devo/36shCCBEAA:snap_in_package/b66dda95-cf9e-48be-918c-8439ecdd548e:snap_in_version/50d4660e-dad9-41d6-9169-8a7e96b2d7fa",
      service_account_id: "don:identity:dvrv-eu-1:devo/36shCCBEAA:svcacc/42",
      secrets: {
        service_account_token: "test-service-account-token"
      }
    },
    execution_metadata: {
      request_id: "63c6f1c6-eabe-452f-a694-7f23a8f5c3cc",
      function_name: "extraction",
      event_type: "EXTRACTION_DATA_START",
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

/**
 * Sends an event to the snap-in server
 */
export async function sendEventToSnapIn(event: TestEventPayload): Promise<any> {
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

/**
 * Waits for a condition to be met with timeout
 */
export async function waitForCondition(
  condition: () => boolean,
  timeoutMs: number = 10000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error(`Condition not met within ${timeoutMs}ms timeout`);
}

/**
 * Updates the last successful sync state via DevRev worker endpoint
 */
export async function updateLastSuccessfulSync(syncUnitId: string, payload: UpdateStatePayload): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const url = `http://localhost:8003/external-worker.update-last-successful-sync/${syncUnitId}`;
    console.log(`Updating last successful sync state at: ${url}`);
    console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
    
    const response = await axios.post(url, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Update state response: ${response.status} - ${JSON.stringify(response.data, null, 2)}`);
    
    return {
      success: response.status >= 200 && response.status < 300,
      data: response.data
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMsg = `DevRev worker request failed: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`;
      console.error(errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }
    const errorMsg = `DevRev worker request failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Updates a Trello card via Trello API
 */
export async function updateTrelloCard(env: TestEnvironment, cardId: string, newName: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const url = `https://api.trello.com/1/cards/${cardId}`;
    console.log(`Updating Trello card at: ${url}`);
    console.log(`New card name: ${newName}`);
    
    const response = await axios.put(url, null, {
      timeout: 10000,
      params: {
        key: env.TRELLO_API_KEY,
        token: env.TRELLO_TOKEN,
        name: newName
      },
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log(`Update card response: ${response.status} - Card updated successfully`);
    
    return {
      success: response.status >= 200 && response.status < 300,
      data: response.data
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMsg = `Trello API request failed: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`;
      console.error(errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }
    const errorMsg = `Trello API request failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Generates a UUID for test data
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validates callback event structure and content according to acceptance test specification
 */
export function validateCallbackEvent(callbackEvent: any, validation: CallbackEventValidation): ValidationResult {
  const errors: string[] = [];
  
  // Check if event exists
  if (!callbackEvent) {
    errors.push('Callback event is null or undefined');
    return { isValid: false, errors };
  }
  
  // Check event type
  if (!callbackEvent.body || callbackEvent.body.event_type !== validation.expectedEventType) {
    errors.push(`Expected event_type '${validation.expectedEventType}', got '${callbackEvent.body?.event_type}'`);
  }
  
  // Check event_data exists
  if (!callbackEvent.body.event_data) {
    errors.push('Missing event_data in callback event');
    return { isValid: false, errors };
  }
  
  // Check artifacts array
  const artifacts = callbackEvent.body.event_data.artifacts;
  if (!Array.isArray(artifacts)) {
    errors.push('event_data.artifacts is not an array or is missing');
    return { isValid: false, errors };
  }
  
  if (artifacts.length === 0) {
    errors.push('event_data.artifacts is an empty array - expected at least cards and attachments artifacts');
    return { isValid: false, errors };
  }
  
  console.log(`Found ${artifacts.length} artifacts: ${artifacts.map((a: any) => `${a.item_type}(${a.item_count})`).join(', ')}`);
  
  // Check for cards artifact
  const cardsArtifacts = artifacts.filter((artifact: any) => artifact.item_type === 'cards');
  if (cardsArtifacts.length === 0) {
    errors.push('No artifact with item_type "cards" found');
  } else if (cardsArtifacts.length > 1) {
    errors.push(`Expected 1 cards artifact, found ${cardsArtifacts.length}`);
  } else {
    const cardsArtifact = cardsArtifacts[0];
    if (cardsArtifact.item_count !== validation.expectedCardsCount) {
      errors.push(`Expected cards artifact item_count to be ${validation.expectedCardsCount}, got ${cardsArtifact.item_count}`);
    }
  }
  
  // Check for attachments artifact (should exist with item_count=2 according to acceptance test)
  const attachmentsArtifacts = artifacts.filter((artifact: any) => artifact.item_type === 'attachments');
  if (attachmentsArtifacts.length === 0) {
    errors.push('No artifact with item_type "attachments" found - expected 1 attachments artifact with item_count=2');
  } else if (attachmentsArtifacts.length > 1) {
    errors.push(`Expected 1 attachments artifact, found ${attachmentsArtifacts.length}`);
  } else {
    const attachmentsArtifact = attachmentsArtifacts[0];
    if (attachmentsArtifact.item_count !== validation.expectedAttachmentsCount) {
      errors.push(`Expected attachments artifact item_count to be ${validation.expectedAttachmentsCount}, got ${attachmentsArtifact.item_count}`);
    }
  }
  
  // Check for users artifact (should NOT exist according to acceptance test)
  const usersArtifacts = artifacts.filter((artifact: any) => artifact.item_type === 'users');
  if (!validation.shouldHaveUsers && usersArtifacts.length > 0) {
    errors.push(`Found ${usersArtifacts.length} users artifact(s), but none were expected - this indicates that users data was incorrectly pushed to DevRev servers in incremental mode`);
  } else if (validation.shouldHaveUsers && usersArtifacts.length === 0) {
    errors.push('Expected users artifact but none found');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Gets the sync_unit_id from the data_extraction_incremental_test.json structure
 */
export function getSyncUnitIdFromTestData(): string {
  // From data_extraction_incremental_test.json: sync_unit_id is "984c894e-71e5-4e94-b484-40b839c9a916"
  return "984c894e-71e5-4e94-b484-40b839c9a916";
}