import express from 'express';
import { Server } from 'http';

export interface CallbackEvent {
  event_type: string;
  event_data?: any;
}

export class CallbackServer {
  private app = express();
  private server: Server | null = null;
  private events: CallbackEvent[] = [];
  private port: number;

  constructor(port: number = 8002) {
    this.port = port;
    this.app.use(express.json());
    
    this.app.post('/', (req, res) => {
      const event = req.body;
      this.events.push(event);
      res.status(200).send();
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Callback server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
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

  public getEvents(): CallbackEvent[] {
    return [...this.events];
  }

  public clearEvents(): void {
    this.events = [];
  }

  public async waitForEvent(eventType: string, timeout: number = 10000): Promise<CallbackEvent | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const event = this.events.find(e => e.event_type === eventType);
      if (event) {
        return event;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return null;
  }
}