import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';

// Server configuration
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const DEVREV_SERVER_URL = 'http://localhost:8003';
const TRELLO_API_URL = 'https://api.trello.com/1';

// Environment variables
const TRELLO_API_KEY = process.env.TRELLO_API_KEY || '';
const TRELLO_TOKEN = process.env.TRELLO_TOKEN || '';
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID || '';

// Test board ID
const TEST_BOARD_ID = '6752eb962a64828e59a35396';

// Maximum retries for API operations
const MAX_RETRIES = 3;

// Validate environment variables
if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
  console.error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  process.exit(1);
}

// Types
export interface CallbackResponse {
  status: number;
  body: any;
}

// Create a callback server to receive responses
export function createCallbackServer(): Promise<{ 
  server: Server; 
  getLastResponse: () => CallbackResponse | null | undefined;
  setResponseHandler: (handler: (response: any) => void) => void;
}> {
  return new Promise((resolve) => {
    let lastResponse: CallbackResponse | null = null;
    let responseHandler: ((response: any) => void) | null = null;
    
    const app = express();
    app.use(bodyParser.json());

    app.post('/callback', (req, res) => {
      console.log('Callback received:', JSON.stringify(req.body, null, 2));
      lastResponse = {
        status: 200,
        body: req.body,
      };
      
      // Call the response handler if set
      if (responseHandler) {
        responseHandler(lastResponse);
      }
      
      res.status(200).send();
    });

    const server = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
      resolve({
        server,
        getLastResponse: () => lastResponse,
        setResponseHandler: (handler) => {
          responseHandler = handler;
        }
      });
    });
  });
}

// Generate a basic event for the extraction function
export function generateExtractionEvent(eventType: string, isIncremental: boolean = false, extractFrom?: string, resetExtractFrom: boolean = true) {
  const connectionData = {
    key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
    org_id: TRELLO_ORGANIZATION_ID,
    org_name: 'Test Organization' + uuidv4().substring(0, 8), // Add uniqueness to avoid caching
    external_sync_unit_id: TEST_BOARD_ID,
    key_type: 'oauth_token'
  };

  const eventContext: any = {
    callback_url: `http://localhost:${CALLBACK_SERVER_PORT}/callback`,
    dev_org: 'DEV-36shCCBEAA',
    dev_org_id: 'DEV-36shCCBEAA',
    dev_user: 'DEVU-1',
    dev_user_id: 'DEVU-1',
    external_sync_unit: TEST_BOARD_ID,
    external_sync_unit_id: TEST_BOARD_ID,
    external_sync_unit_name: 'SaaS connectors',
    external_system: '6752eb95c833e6b206fcf388',
    external_system_id: '6752eb95c833e6b206fcf388',
    external_system_type: 'ADaaS',
    import_slug: 'trello-snapin-devrev',
    mode: isIncremental ? 'INCREMENTAL' : 'INITIAL',
    request_id: `63c6f1c6-eabe-452f-a694-7f23a8f5c3cc`,
    snap_in_slug: 'trello-snapin-devrev-' + uuidv4().substring(0, 8), // Add uniqueness
    snap_in_version_id: 'don:integration:dvrv-eu-1:devo/36shCCBEAA:snap_in_package/b66dda95-cf9e-48be-918c-8439ecdd548e:snap_in_version/50d4660e-dad9-41d6-9169-8a7e96b2d7fa',
    sync_run: 'cbbe2419-1f86-4737-aa78-6bb7118ce52c',
    sync_run_id: 'cbbe2419-1f86-4737-aa78-6bb7118ce52c',
    sync_tier: 'sync_tier_2',
    sync_unit: 'don:integration:dvrv-eu-1:devo/36shCCBEAA:external_system_type/ADAAS:external_system/6752eb95c833e6b206fcf388:sync_unit/984c894e-71e5-4e94-b484-40b839c9a916',
    sync_unit_id: '984c894e-71e5-4e94-b484-40b839c9a916',
    uuid: '63c6f1c6-eabe-452f-a694-7f23a8f5c3cc',
    worker_data_url: 'http://localhost:8003/external-worker'
  };

  // Add extract_from if provided
  if (extractFrom) {
    eventContext.extract_from = extractFrom;
    eventContext.reset_extract_from = resetExtractFrom;
  }

  return {
    payload: {
      connection_data: connectionData,
      event_context: eventContext,
      event_type: eventType,
    },
    context: {
      dev_oid: 'don:identity:dvrv-eu-1:devo/36shCCBEAA',
      source_id: '',
      snap_in_id: 'don:integration:dvrv-eu-1:devo/36shCCBEAA:snap_in/03a783b1-5d9f-4af8-b958-e401f2022439',
      snap_in_version_id: 'don:integration:dvrv-eu-1:devo/36shCCBEAA:snap_in_package/b66dda95-cf9e-48be-918c-8439ecdd548e:snap_in_version/50d4660e-dad9-41d6-9169-8a7e96b2d7fa',
      service_account_id: 'don:identity:dvrv-eu-1:devo/36shCCBEAA:svcacc/42',
      secrets: {
        service_account_token: 'test-service-account-token',
      }
    },
    execution_metadata: {
      request_id: '63c6f1c6-eabe-452f-a694-7f23a8f5c3cc',
      function_name: 'extraction',
      event_type: 'EXTRACTION_DATA_START',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {},
      keyrings: null,
      resources: {
        keyrings: {},
        tags: {}
      }
    }
  };
}

// Send an event to the snap-in server
export async function sendEventToSnapIn(event: any): Promise<any> {
  try {
    console.log('Sending event to snap-in server:', JSON.stringify(event.payload.event_type));
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    return response.data;
  } catch (error) {
    console.error('Error sending event to snap-in server:', error);
    throw error;
  }
}

// Wait for a specific amount of time
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Update a Trello card
export async function updateTrelloCard(cardId: string, updates: Record<string, any>): Promise<any> {
  try {
    // Build query parameters
    const params = new URLSearchParams({ 
      key: TRELLO_API_KEY,
      token: TRELLO_TOKEN,
      ...updates
    });
    
    const url = `${TRELLO_API_URL}/cards/${cardId}?${params.toString()}`;
    const response = await axios.put(url, {}, {
      headers: {
        'Accept': 'application/json'
      }
      // Note: Trello API returns the updated card in the response
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating Trello card:', error);
    throw new Error(`Failed to update Trello card ${cardId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Fetch cards from a Trello board
export async function fetchBoardCards(boardId: string): Promise<any[]> {
  try {
    const url = `${TRELLO_API_URL}/boards/${boardId}/cards`;
    const params = new URLSearchParams({
      key: TRELLO_API_KEY,
      token: TRELLO_TOKEN
    });
    
    const response = await axios.get(`${url}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching board cards:', error);
    throw new Error(`Failed to fetch cards for board ${boardId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Find a suitable card for testing
export async function findTestCard(boardId: string): Promise<string> {
  try {
    console.log(`Fetching cards from board ${boardId} to find a suitable test card...`);
    const cards = await fetchBoardCards(boardId);
    
    if (!cards || cards.length === 0) {
      throw new Error(`No cards found on board ${boardId}`);
    }
    
    console.log(`Found ${cards.length} cards on the board`);
    
    // Find a card that's not a template and has a name
    const suitableCard = cards.find(card => !card.isTemplate && card.name);
    
    if (!suitableCard) {
      // If no suitable card found, just use the first one
      console.log(`Using first card with ID: ${cards[0].id}`);
      return cards[0].id;
    }
    
    console.log(`Using suitable card with ID: ${suitableCard.id}, Name: ${suitableCard.name}`);
    return suitableCard.id;
  } catch (error) {
    throw new Error(`Failed to find a test card: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Wait for a callback response that matches a predicate
export async function waitForCallbackResponse(
  responses: any[],
  predicate: (response: any) => boolean,
  timeout: number = 30000
): Promise<any> {  
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    // Check if any existing response matches the predicate
    const matchingResponse = responses.find(predicate);
    if (matchingResponse) {
      return matchingResponse;
    }
    
    // Wait a bit before checking again (polling interval)
    await wait(1000);
  }
  
  throw new Error(`Timed out waiting for callback response after ${timeout}ms`);
}

// Wait for a callback response with retry logic
export async function waitForCallbackResponseWithRetry(
  responses: any[],
  predicate: (response: any) => boolean,
  timeout: number = 30000,
  retryCount: number = 3
): Promise<any> {  
  const startTime = Date.now();
  let attempts = 0;
  
  while (attempts < retryCount) {
    try {
      // Try to find a matching response
      const result = await waitForCallbackResponse(responses, predicate, timeout / retryCount);
      return result;
    } catch (error) {
      attempts++;
      console.log(`Retry attempt ${attempts}/${retryCount} for callback response. Waiting for matching response...`);
      
      // If we've exceeded our total timeout, throw the error
      if (Date.now() - startTime >= timeout) {
        throw error;
      }
    }
  }
  
  throw new Error(`Failed to get callback response after ${retryCount} attempts`);
}

// Validate a callback response
export function validateCallbackResponse(response: any, expectedEventType: string): void {
  expect(response).toBeDefined();
  expect(response).not.toBeNull();
  expect(response.body).toBeDefined();
  
  // Additional validation to provide better error messages
  if (!response || !response.body) {
    throw new Error(`Invalid callback response: ${JSON.stringify(response)}`);
  }
  
  expect(response.body.event_type).toBe(expectedEventType);
  
  if (response.body.event_type !== expectedEventType) {
    throw new Error(`Expected event type ${expectedEventType} but got ${response.body.event_type}`);
  }
}

// Find a cards artifact in the event data
export function findCardsArtifact(eventData: any): any {
  if (!eventData) {
    console.log('Event data is undefined or null');
    return null;
  }
  
  if (!eventData.artifacts || !Array.isArray(eventData.artifacts)) {
    console.log('No artifacts array found in event data');
    return null;
  }
  
  const cardsArtifact = eventData.artifacts.find(
    (artifact: any) => artifact.item_type === 'cards'
  );
  
  if (!cardsArtifact) {
    console.log('No cards artifact found in artifacts array');
    return null;
  }
  
  console.log('Found cards artifact:', cardsArtifact);
  return cardsArtifact;
}