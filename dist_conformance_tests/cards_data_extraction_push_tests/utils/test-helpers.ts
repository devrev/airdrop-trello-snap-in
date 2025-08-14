import { snapInClient } from './http-client';
import * as fs from 'fs';
import axios, { AxiosError } from 'axios';
import * as path from 'path';

export function createExtractionEvent(eventType: string, initialState: any = {}) {
  // Get credentials from environment variables
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const orgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!apiKey || !token || !orgId) {
    throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  }

  // Format the state properly for the worker
  const state = {
    users: initialState.users || { completed: false },
    cards: initialState.cards || { completed: false },
    attachments: initialState.attachments || { completed: false }
  };

  return {
    payload: {
      connection_data: {
        key: `key=${apiKey}&token=${token}`,
        org_id: orgId,
        org_name: 'Test Organization'
      },
      event_context: {
        external_sync_unit_id: '688725dad59c015ce052eecf', // Board ID for testing
        callback_url: 'http://localhost:8002/callback',
        request_id: `test-${Date.now()}`,
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_type: eventType,
      event_data: { 
        state: state
      }
    },
    context: {
      dev_oid: 'dev_oid',
      source_id: 'source_id',
      snap_in_id: 'snap_in_id',
      snap_in_version_id: 'snap_in_version_id',
      service_account_id: 'service_account_id',
      secrets: {
        service_account_token: 'test-token'
      }
    },
    execution_metadata: {
      request_id: `test-${Date.now()}`,
      function_name: 'extraction',
      event_type: 'test',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

export async function invokeExtractionFunction(eventType: string, initialState: any = {}) {
  const event = createExtractionEvent(eventType, initialState);
  
  try {
    const response = await snapInClient.post('/handle/sync', event);
    return response.data;
  } catch (error) {
    // Log the error but don't throw to allow tests to continue
    // and check callback events which may still be received
    console.error('Error invoking extraction function:', error);
    throw error;
  }
}

export async function invokeExternalDomainMetadataFunction() {
  try {
    // Read the event payload from the resource file
    const testDataPath = path.resolve(__dirname, '../test-data/external_domain_metadata_event_payload.json');
    
    if (!fs.existsSync(testDataPath)) {
      throw new Error(`External domain metadata event payload file not found at path: ${testDataPath}`);
    }
    
    const testDataRaw = fs.readFileSync(testDataPath, 'utf8');
    const event = JSON.parse(testDataRaw);
    
    // Get credentials from environment variables
    const apiKey = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    const orgId = process.env.TRELLO_ORGANIZATION_ID;

    if (!apiKey || !token || !orgId) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
    }

    // Replace placeholders in the event payload
    if (event.payload && event.payload.connection_data) {
      const connectionData = event.payload.connection_data;
      connectionData.key = connectionData.key
        .replace('<TRELLO_API_KEY>', apiKey)
        .replace('<TRELLO_TOKEN>', token);
      connectionData.org_id = connectionData.org_id
        .replace('<TRELLO_ORGANIZATION_ID>', orgId);
    }
    
    // Update execution metadata
    if (event.execution_metadata) {
      event.execution_metadata.function_name = 'get_external_domain_metadata';
      event.execution_metadata.event_type = 'get_external_domain_metadata';
    }
    
    // Send the request to the Snap-In Server
    const response = await snapInClient.post('/handle/sync', event);
    return response.data;
  } catch (error) {
    console.error('Error invoking external domain metadata function:', error);
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        throw new Error(`Failed to invoke external domain metadata function: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    } else {
      throw error;
    }
  }
}