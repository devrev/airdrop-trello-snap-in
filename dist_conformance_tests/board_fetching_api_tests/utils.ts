import axios from 'axios';
import express from 'express';
import { Server } from 'http';

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;
export const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Environment variables
export function getEnvVariables() {
  const requiredVars = ['TRELLO_API_KEY', 'TRELLO_TOKEN', 'TRELLO_ORGANIZATION_ID'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  return {
    trelloApiKey: process.env.TRELLO_API_KEY!,
    trelloToken: process.env.TRELLO_TOKEN!,
    trelloOrgId: process.env.TRELLO_ORGANIZATION_ID!
  };
}

// Create a connection data string for Trello API
export function createConnectionData() {
  const { trelloApiKey, trelloToken } = getEnvVariables();
  return {
    key: `key=${trelloApiKey}&token=${trelloToken}`,
    key_type: 'api_key'
  };
}

// Create a function input event
export function createFunctionInput(functionName: string) {
  return {
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token'
      }
    },
    execution_metadata: {
      request_id: `test-request-${Date.now()}`,
      function_name: functionName,
      event_type: 'test-event',
      devrev_endpoint: 'http://localhost:8003'
    },
    payload: {
      connection_data: createConnectionData(),
      event_context: {
        external_sync_unit_id: '6752eb95c833e6b206fcf388'
      }
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Send a request to the snap-in server
export async function callSnapInFunction(functionName: string) {
  try {
    const functionInput = createFunctionInput(functionName);
    const response = await axios.post(SNAP_IN_SERVER_URL, functionInput);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to call snap-in function: ${error.message}, Status: ${error.response?.status}, Data: ${JSON.stringify(error.response?.data)}`);
    }
    throw error;
  }
}

// Create a callback server for testing
export function createCallbackServer(path: string, callback: (data: any) => void): Server {
  const app = express();
  app.use(express.json());
  
  app.post(path, (req, res) => {
    callback(req.body);
    res.status(200).send();
  });
  
  return app.listen(CALLBACK_SERVER_PORT, () => {
    console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
  });
}