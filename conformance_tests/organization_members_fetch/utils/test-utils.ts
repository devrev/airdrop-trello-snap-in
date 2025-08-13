import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;
export const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Types
export interface Context {
  dev_oid: string;
  source_id: string;
  snap_in_id: string;
  snap_in_version_id: string;
  service_account_id: string;
  secrets: Record<string, string>;
}

export interface ExecutionMetadata {
  request_id: string;
  function_name: string;
  event_type: string;
  devrev_endpoint: string;
}

export interface InputData {
  global_values: Record<string, string>;
  event_sources: Record<string, string>;
}

export interface FunctionEvent {
  payload: Record<string, any>;
  context: Context;
  execution_metadata: ExecutionMetadata;
  input_data: InputData;
}

// Create a test event with the required structure
export function createTestEvent(functionName: string, payload: Record<string, any> = { connection_data: {} }): FunctionEvent {
  return {
    payload,
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token',
      },
    },
    execution_metadata: {
      request_id: `test-request-${Date.now()}`,
      function_name: functionName,
      event_type: 'test',
      devrev_endpoint: 'http://localhost:8003',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
  };
}

// Create Trello connection data with credentials from environment
export function createTrelloConnectionData() {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const orgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!apiKey || !token || !orgId) {
    throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  }

  return {
    key: `key=${apiKey}&token=${token}`,
    key_type: 'api_key',
    org_id: orgId,
    org_name: 'Test Organization',
  };
}

// Send a request to the snap-in server
export async function invokeFunction(event: FunctionEvent) {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, event, {
      timeout: 10000 // Add timeout to prevent hanging tests
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error(`Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      // Return a structured error response instead of throwing
      return {
        function_result: { success: false, message: `Server error: ${error.response.status}` },
        error: { message: JSON.stringify(error.response.data) }
      };
    }
    return { function_result: { success: false, message: `Request error: ${error}` } };
  }
}

// Create a callback server for receiving responses
export function createCallbackServer(): Promise<{ server: Server; close: () => void }> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    let responseData: any = null;

    app.post('/callback', (req, res) => {
      responseData = req.body;
      res.status(200).send({ status: 'ok' });
    });

    const server = app.listen(CALLBACK_SERVER_PORT, () => {
      resolve({
        server,
        close: () => {
          server.close();
        },
      });
    });
  });
}