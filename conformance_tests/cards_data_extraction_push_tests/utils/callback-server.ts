import express from 'express';
import { Server } from 'http';

export interface CallbackEvent {
  event_type: string;
  event_context: {
    external_sync_unit_id: string;
    [key: string]: any;
  };
  event_data: {
    artifacts: Array<{id: string, item_type: string, item_count: number}>;
    [key: string]: any;
  };
}

export class CallbackServer {
  private server: Server | null = null;
  private events: any[] = [];
  private port = 8002;
  private app: express.Application;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    
    this.app.post('/callback', async (req, res) => {
      console.log('Received callback:', JSON.stringify(req.body));
      this.events.push(req.body);
      res.status(200).send();
    });
  }

  start(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Callback server listening on port ${this.port}`);
        this.events = []; // Clear events on start
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      
      // Set a timeout to force close the server if it doesn't close gracefully
      let forceCloseTimeout: NodeJS.Timeout | null = null;
      
      forceCloseTimeout = global.setTimeout(() => {
        console.log('Forcing callback server to close after timeout');
        this.server = null;
        this.events = [];
        resolve();
      }, 3000);

      this.server.close((err?: Error) => {
        if (forceCloseTimeout) {
          clearTimeout(forceCloseTimeout);
          forceCloseTimeout = null;
        }
        if (err && err.message !== 'Server is not running' && err.message !== 'Not running') {
          console.error('Error closing callback server:', err);
          reject(err);
        } else {
          this.server = null;
          this.events = [];
          resolve();
        }
      });
    });
  }

  getEvents(): CallbackEvent[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }
}