import axios from 'axios';
import express from 'express';
import { Server } from 'http';

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;
export const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
export const MOCK_API_SERVER_URL = 'http://localhost:8004';

// Environment variables
export function getRequiredEnvVars() {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!trelloApiKey || !trelloToken || !trelloOrgId) {
    throw new Error(
      'Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, or TRELLO_ORGANIZATION_ID'
    );
  }

  return { trelloApiKey, trelloToken, trelloOrgId };
}

// Create a callback server for testing
export function createCallbackServer(): Promise<{ server: Server; callbackPromise: Promise<any> }> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    let callbackResolve: (value: any) => void;
    const callbackPromise = new Promise((res) => {
      callbackResolve = res;
    });

    app.post('/callback', (req, res) => {
      callbackResolve(req.body);
      res.status(200).send();
    });

    const server = app.listen(CALLBACK_SERVER_PORT, () => {
      resolve({ server, callbackPromise });
    });
  });
}

// Send event to snap-in server
export async function sendEventToSnapInServer(event: any, timeout = 10000): Promise<any> {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Snap-in server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  } finally {
    // Ensure any open connections are properly closed
  }
}

// Replace credentials in event payload
export function replaceCredentialsInPayload(payload: any): any {
  const { trelloApiKey, trelloToken, trelloOrgId } = getRequiredEnvVars();
  
  const updatedPayload = JSON.parse(JSON.stringify(payload));
  
  if (updatedPayload.payload?.connection_data) {
    updatedPayload.payload.connection_data.key = `key=${trelloApiKey}&token=${trelloToken}`;
    updatedPayload.payload.connection_data.org_id = trelloOrgId;
  }
  
  return updatedPayload;
}

// Control rate limiting for tests
export async function controlRateLimiting(action: 'start' | 'end', testName: string): Promise<void> {
  try {
    const endpoint = action === 'start' ? '/start_rate_limiting' : '/end_rate_limiting';
    await axios.post(`${MOCK_API_SERVER_URL}${endpoint}`, { test_name: testName });
    console.log(`Rate limiting ${action === 'start' ? 'started' : 'ended'} for test: ${testName}`);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Rate limiting control error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}