import axios from 'axios';
import * as http from 'http';
import * as crypto from 'crypto';

export interface Credentials {
  apiKey: string;
  token: string;
  organizationId: string;
}

export interface CallbackEvent {
  event_type: string;
  event_data?: any;
  [key: string]: any;
}

/**
 * Get credentials from environment variables
 */
export function getCredentials(): Credentials {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const organizationId = process.env.TRELLO_ORGANIZATION_ID;

  if (!apiKey) {
    throw new Error('TRELLO_API_KEY environment variable is not set');
  }
  if (!token) {
    throw new Error('TRELLO_TOKEN environment variable is not set');
  }
  if (!organizationId) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is not set');
  }

  return { apiKey, token, organizationId };
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Load event fixture and replace credential placeholders
 */
export function loadEventFixture(fixtureData: any, credentials: Credentials): any {
  const eventStr = JSON.stringify(fixtureData);
  const replaced = eventStr
    .replace(/<TRELLO_API_KEY>/g, credentials.apiKey)
    .replace(/<TRELLO_TOKEN>/g, credentials.token)
    .replace(/6752eb95c833e6b206fcf388/g, credentials.organizationId);
  
  return JSON.parse(replaced);
}

/**
 * Setup callback server on port 8002
 */
export function setupCallbackServer(): Promise<{
  server: http.Server;
  getEvents: () => CallbackEvent[];
  close: () => Promise<void>;
}> {
  return new Promise((resolve, reject) => {
    const events: CallbackEvent[] = [];
    
    const server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const event = JSON.parse(body);
            events.push(event);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(8002, () => {
      resolve({
        server,
        getEvents: () => events,
        close: () => new Promise((resolveClose) => {
          server.close(() => resolveClose());
        }),
      });
    });

    server.on('error', reject);
  });
}

/**
 * Invoke snap-in function
 */
export async function invokeSnapIn(event: any): Promise<void> {
  await axios.post('http://localhost:8000/handle/sync', event, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 60000,
  });
}

/**
 * Wait for callback events with timeout
 */
export async function waitForCallback(
  getEvents: () => CallbackEvent[],
  expectedCount: number,
  timeoutMs: number
): Promise<CallbackEvent[]> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const events = getEvents();
    if (events.length >= expectedCount) {
      return events;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(
    `Timeout waiting for callback events. Expected ${expectedCount}, got ${getEvents().length}`
  );
}

/**
 * Update last successful sync state
 */
export async function updateLastSuccessfulSync(
  syncUnitId: string,
  state: any
): Promise<void> {
  const url = `http://localhost:8003/external-worker.update-last-successful-sync/${syncUnitId}`;
  const payload = {
    snap_in_version_id: 'test-version-id',
    extend_state: state,
  };

  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });

  if (response.status !== 200) {
    throw new Error(
      `Failed to update last successful sync. Status: ${response.status}, Data: ${JSON.stringify(response.data)}`
    );
  }
}

/**
 * Update Trello card name
 */
export async function updateTrelloCard(
  cardId: string,
  newName: string,
  credentials: Credentials
): Promise<void> {
  const url = `https://api.trello.com/1/cards/${cardId}`;
  const params = {
    key: credentials.apiKey,
    token: credentials.token,
    name: newName,
  };

  const response = await axios.put(url, null, {
    params,
    headers: { 'Accept': 'application/json' },
    timeout: 10000,
  });

  if (response.status !== 200) {
    throw new Error(
      `Failed to update Trello card. Status: ${response.status}, Data: ${JSON.stringify(response.data)}`
    );
  }
}