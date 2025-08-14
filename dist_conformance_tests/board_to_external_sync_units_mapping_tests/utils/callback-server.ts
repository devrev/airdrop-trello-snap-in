import express from 'express';
import { Server } from 'http';
import { ExtractorEventType, ExternalSyncUnit } from './types';

export interface CallbackData {
  event_type: string;
  event_data: {
    // Properly type the external_sync_units to ensure TypeScript validation
    external_sync_units?: ExternalSyncUnit[];
    artifacts?: any[];
    error?: { message: string };
    progress?: number;
    delay?: number;
  };
  event_context?: any;
  worker_metadata?: any;
}

export class CallbackServer {
  private app = express();
  private server?: Server;
  private callbackData: CallbackData | null = null;
  private callbackReceived = false;

  constructor(private port: number = 8002) {
    this.app.use(express.json());
    
    this.app.post('/callback', (req, res) => {
      console.log('Received callback data');
      this.callbackData = req.body;
      this.callbackReceived = true;
      res.status(200).send();
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Callback server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            console.error('Error closing callback server:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async waitForCallback(timeoutMs: number = 10000): Promise<CallbackData> {
    const startTime = Date.now();
    
    while (!this.callbackReceived) {
      // Check for timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Callback not received within ${timeoutMs}ms`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!this.callbackData) {
      throw new Error('Callback was received but data is null');
    }
    
    console.log('Returning callback data:', JSON.stringify(this.callbackData, null, 2));
    return this.callbackData;
  }

  resetCallback(): void {
    this.callbackData = null;
    this.callbackReceived = false;
  }
}