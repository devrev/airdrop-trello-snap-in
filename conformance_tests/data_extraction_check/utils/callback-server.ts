import express from 'express';
import { Server } from 'http';

export interface CallbackEvent {
  event_type: string;
  data?: any;
}

export class CallbackServer {
  private server: Server | null = null;
  private app = express();
  private events: CallbackEvent[] = [];
  private port = 8002;

  constructor() {
    this.app.use(express.json());
    
    this.app.post('/callback', (req, res) => {
      const event = req.body;
      console.log('Received callback event:', JSON.stringify(event, null, 2));
      this.events.push(event);
      res.status(200).send({ status: 'ok' });
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
      if (!this.server) {
        resolve();
        return;
      }
      
      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.server = null;
          resolve();
        }
      });
    });
  }

  getEvents(): CallbackEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}