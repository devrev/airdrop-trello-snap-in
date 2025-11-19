import axios from 'axios';
import express, { Express } from 'express';
import bodyParser from 'body-parser';
import * as http from 'http';

export interface CallbackEvent {
  event_type: string;
  event_data?: any;
}

export class CallbackServer {
  private app: Express;
  private server: http.Server | null = null;
  private receivedEvents: CallbackEvent[] = [];
  private eventPromise: Promise<CallbackEvent> | null = null;
  private eventResolve: ((event: CallbackEvent) => void) | null = null;

  constructor() {
    this.app = express();
    this.app.use(bodyParser.json());

    this.app.post('/callback', (req, res) => {
      const event: CallbackEvent = req.body;
      this.receivedEvents.push(event);
      
      if (this.eventResolve) {
        this.eventResolve(event);
        this.eventResolve = null;
      }
      
      res.status(200).send({ status: 'received' });
    });
  }

  async start(port: number = 8002): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          resolve();
        });
      });
    }
  }

  waitForEvent(timeoutMs: number = 120000): Promise<CallbackEvent> {
    if (this.receivedEvents.length > 0) {
      return Promise.resolve(this.receivedEvents[this.receivedEvents.length - 1]);
    }

    this.eventPromise = new Promise((resolve, reject) => {
      this.eventResolve = resolve;
      
      setTimeout(() => {
        if (this.eventResolve) {
          this.eventResolve = null;
          reject(new Error(`Timeout waiting for callback event after ${timeoutMs}ms`));
        }
      }, timeoutMs);
    });

    return this.eventPromise;
  }

  getReceivedEvents(): CallbackEvent[] {
    return this.receivedEvents;
  }

  clearEvents(): void {
    this.receivedEvents = [];
  }
}

export async function invokeSnapIn(payload: any): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000,
  });
  return response.data;
}

export function loadTestPayload(filename: string): any {
  const payload = require(`./${filename}`);
  
  // Replace placeholders with actual credentials
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const orgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!apiKey || !token || !orgId) {
    throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  }

  payload.payload.connection_data.key = `key=${apiKey}&token=${token}`;
  payload.payload.connection_data.org_id = orgId;

  return payload;
}

export async function verifyArtifactUpload(artifactId: string): Promise<boolean> {
  try {
    const response = await axios.get(`http://localhost:8003/is_uploaded/${artifactId}`, {
      timeout: 10000,
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

export async function triggerRateLimiting(testIdentifier: string): Promise<boolean> {
  try {
    const response = await axios.post('http://localhost:8004/start_rate_limiting', {
      test_identifier: testIdentifier,
    }, {
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error) {
    console.error('Failed to trigger rate limiting:', error);
    return false;
  }
}