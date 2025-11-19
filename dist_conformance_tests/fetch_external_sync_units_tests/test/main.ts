import axios from 'axios';
import express, { Express } from 'express';
import { Server } from 'http';

/**
 * Test environment configuration
 */
export interface TestConfig {
  snapInServerUrl: string;
  callbackServerUrl: string;
  callbackServerPort: number;
}

/**
 * Get test configuration from environment or use defaults
 */
export function getTestConfig(): TestConfig {
  return {
    snapInServerUrl: 'http://localhost:8000/handle/sync',
    callbackServerUrl: 'http://localhost:8002',
    callbackServerPort: 8002,
  };
}

/**
 * Get Trello credentials from environment
 */
export function getTrelloCredentials() {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const orgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!apiKey || !token || !orgId) {
    throw new Error('Missing required Trello credentials in environment variables');
  }

  return {
    apiKey,
    token,
    orgId,
  };
}

/**
 * Setup callback server for testing
 */
export async function setupCallbackServer(port: number): Promise<{
  app: Express;
  server: Server;
  receivedCallbacks: any[];
}> {
  const app = express();
  app.use(express.json());

  const receivedCallbacks: any[] = [];

  app.post('*', (req, res) => {
    receivedCallbacks.push(req.body);
    res.status(200).json({ success: true });
  });

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(port, () => {
      resolve(s);
    });
  });

  return { app, server, receivedCallbacks };
}

/**
 * Teardown callback server
 */
export async function teardownCallbackServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Send event to snap-in server
 */
export async function sendEventToSnapIn(
  snapInServerUrl: string,
  event: any
): Promise<any> {
  const response = await axios.post(snapInServerUrl, event, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  return response.data;
}

/**
 * Wait for callback with timeout
 */
export async function waitForCallback(
  receivedCallbacks: any[],
  timeoutMs: number = 10000
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (receivedCallbacks.length > 0) {
      return receivedCallbacks[receivedCallbacks.length - 1];
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('Timeout waiting for callback');
}