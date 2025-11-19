import axios from 'axios';
import * as http from 'http';

/**
 * Read required environment variables for Trello credentials
 */
export function readCredentials() {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const orgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!apiKey) {
    throw new Error('TRELLO_API_KEY environment variable is not set');
  }
  if (!token) {
    throw new Error('TRELLO_TOKEN environment variable is not set');
  }
  if (!orgId) {
    throw new Error('TRELLO_ORGANIZATION_ID environment variable is not set');
  }

  return { apiKey, token, orgId };
}

/**
 * Build connection data key from API key and token
 */
export function buildConnectionDataKey(apiKey: string, token: string): string {
  return `key=${apiKey}&token=${token}`;
}

/**
 * Setup callback server to receive events from DevRev
 * Returns a promise that resolves with the received event and a cleanup function
 */
export function setupCallbackServer(port: number = 8002): {
  eventPromise: Promise<any>;
  cleanup: () => Promise<void>;
} {
  let server: http.Server;
  let resolveEvent: (event: any) => void;
  let rejectEvent: (error: Error) => void;
  let eventReceived = false;

  const eventPromise = new Promise<any>((resolve, reject) => {
    resolveEvent = resolve;
    rejectEvent = reject;

    server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        if (eventReceived) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, note: 'Event already received' }));
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const event = JSON.parse(body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
            eventReceived = true;
            resolve(event);
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
            reject(new Error(`Failed to parse callback event: ${error}`));
          }
        });
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    });

    server.listen(port, () => {
      console.log(`Callback server listening on port ${port}`);
    });

    server.on('error', (error) => {
      reject(new Error(`Callback server error: ${error.message}`));
    });
  });

  const cleanup = async () => {
    return new Promise<void>((resolve) => {
      if (server) {
        server.close(() => {
          console.log('Callback server closed');
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  return { eventPromise, cleanup };
}

/**
 * Send event to snap-in server
 */
export async function sendEventToSnapIn(event: any, snapInUrl: string = 'http://localhost:8000/handle/sync') {
  try {
    const response = await axios.post(snapInUrl, event, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 100000, // 100 seconds
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        `Failed to send event to snap-in server: ${error.message}. ` +
        `Response: ${JSON.stringify(error.response?.data)}`
      );
    }
    throw error;
  }
}

/**
 * Wait for callback event with timeout
 */
export async function waitForCallbackEvent(
  eventPromise: Promise<any>,
  timeoutMs: number = 100000
): Promise<any> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Timeout waiting for callback event after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([eventPromise, timeoutPromise]);
}