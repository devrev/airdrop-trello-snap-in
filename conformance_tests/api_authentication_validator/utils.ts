import axios from 'axios';
import express from 'express';
import * as http from 'http';

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;

// Types
export interface SnapInResponse {
  function_result?: any;
  error?: any;
}

// Utility function to make requests to the Snap-In server
export async function callSnapInFunction(
  functionName: string,
  payload: any = {}
): Promise<SnapInResponse> {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, {
      execution_metadata: {
        function_name: functionName,
        devrev_endpoint: 'http://localhost:8003',
      },
      context: {
        secrets: {
          service_account_token: 'test-token',
        },
      },
      payload,
    });
    return response.data;
  } catch (error) {
    console.error('Error calling Snap-In function:', error);
    throw error;
  }
}

// Create a callback server for testing
export function createCallbackServer(): Promise<{
  server: http.Server;
  app: express.Express;
  url: string;
}> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());
    
    const server = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
      resolve({
        server,
        app,
        url: `http://localhost:${CALLBACK_SERVER_PORT}`,
      });
    });
  });
}