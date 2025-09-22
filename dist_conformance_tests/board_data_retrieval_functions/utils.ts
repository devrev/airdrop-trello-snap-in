import axios from 'axios';
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import fs from 'fs';
import path from 'path';

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;
export const MOCK_API_SERVER_URL = 'http://localhost:8004';

// Environment variables
export function getRequiredEnvVars(skipCheck = false) {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!skipCheck && (!trelloApiKey || !trelloToken || !trelloOrgId)) {
    throw new Error(
      'Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, or TRELLO_ORGANIZATION_ID'
    );
  }

  return { trelloApiKey, trelloToken, trelloOrgId };
}

// Load and prepare test event
export function loadTestEvent(functionName: string, skipEnvCheck = false): any {
  const eventPath = path.join(__dirname, 'test-event.json');
  const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  
  // Set the function name
  eventData.execution_metadata.function_name = functionName;
  
  const { trelloApiKey, trelloToken, trelloOrgId } = getRequiredEnvVars(skipEnvCheck);
  eventData.payload.connection_data.key = `key=${trelloApiKey}&token=${trelloToken}`;
  eventData.payload.connection_data.org_id = trelloOrgId;
  
  return eventData;
}

// Setup callback server
export function setupCallbackServer(): Promise<{ server: http.Server; url: string; responsePromise: Promise<any> }> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());
    
    let responseResolve: (value: any) => void;
    const responsePromise = new Promise((res) => {
      responseResolve = res;
    });
    
    app.post('/callback', (req, res) => {
      res.status(200).send();
      responseResolve(req.body);
    });
    
    const server = app.listen(CALLBACK_SERVER_PORT, () => {
      const address = server.address() as AddressInfo;
      const url = `http://localhost:${address.port}/callback`;
      resolve({ server, url, responsePromise });
    });
  });
}

// Send request to snap-in server
export async function sendToSnapInServer(event: any, timeout = 10000): Promise<any> {
  try {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
      controller.abort();
      timeoutId = null;
    }, timeout);
    
    const response = await axios.post(SNAP_IN_SERVER_URL, event || {}, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    
    if (timeoutId) clearTimeout(timeoutId);
    
    return response.data;
  } catch (error) {
    console.error('Error sending request to snap-in server:', error);
    throw error;
  }
}

// Toggle rate limiting on/off
export async function toggleRateLimiting(action: 'start' | 'end', testName: string): Promise<void> {
  try {
    const endpoint = action === 'start' ? '/start_rate_limiting' : '/end_rate_limiting';
    const response = await axios.post(`${MOCK_API_SERVER_URL}${endpoint}`, {
      test_name: testName
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to ${action} rate limiting. Status: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error ${action === 'start' ? 'starting' : 'ending'} rate limiting:`, error);
    throw error;
  }
}

// Helper to close all open handles
export function closeAllHandles(): Promise<void> {
  // Force garbage collection to clean up any lingering handles
  return new Promise(resolve => setTimeout(resolve, 100));
}