import axios from 'axios';
import * as http from 'http';

/**
 * Credentials read from environment variables
 */
export interface Credentials {
  apiKey: string;
  token: string;
  organizationId: string;
}

/**
 * Read credentials from environment variables
 */
export function readCredentials(): Credentials {
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
 * Replace credential placeholders in event payload
 */
export function replaceCredentials(event: any, credentials: Credentials): any {
  const eventCopy = JSON.parse(JSON.stringify(event));
  
  // Replace connection_data.key with actual credentials
  if (eventCopy.payload?.connection_data?.key) {
    eventCopy.payload.connection_data.key = `key=${credentials.apiKey}&token=${credentials.token}`;
  }
  
  // Replace connection_data.org_id with actual organization ID
  if (eventCopy.payload?.connection_data?.org_id) {
    eventCopy.payload.connection_data.org_id = credentials.organizationId;
  }
  
  return eventCopy;
}

/**
 * Send event to snap-in server
 */
export async function sendEventToSnapIn(event: any): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', event, {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
  return response.data;
}

/**
 * Callback server for receiving events from DevRev
 */
export class CallbackServer {
  private server: http.Server | null = null;
  private receivedEvents: any[] = [];
  private port: number;
  private resolvePromise: ((events: any[]) => void) | null = null;

  constructor(port: number = 8002) {
    this.port = port;
  }

  /**
   * Start the callback server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        if (req.method === 'POST') {
          let body = '';
          
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          
          req.on('end', () => {
            try {
              const event = JSON.parse(body);
              this.receivedEvents.push(event);
              
              // Resolve the waiting promise if it exists
              if (this.resolvePromise) {
                this.resolvePromise(this.receivedEvents);
                this.resolvePromise = null;
              }
              
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

      this.server.listen(this.port, () => {
        resolve();
      });

      this.server.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Wait for events to be received
   */
  waitForEvents(timeoutMs: number = 30000): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for callback events after ${timeoutMs}ms. Received ${this.receivedEvents.length} events so far.`));
      }, timeoutMs);

      this.resolvePromise = (events) => {
        clearTimeout(timeout);
        resolve(events);
      };

      // If events already received, resolve immediately
      if (this.receivedEvents.length > 0) {
        clearTimeout(timeout);
        resolve(this.receivedEvents);
      }
    });
  }

  /**
   * Get received events
   */
  getReceivedEvents(): any[] {
    return this.receivedEvents;
  }

  /**
   * Stop the callback server
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}