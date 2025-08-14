import express from 'express';
import { Server } from 'http';

export interface CallbackServerOptions {
  port: number;
}

export class CallbackServer {
  private app = express();
  private server: Server | null = null;
  private events: any[] = [];
  private resolvers: ((event: any) => void)[] = [];

  constructor(private options: CallbackServerOptions) {
    this.app.use(express.json());
    
    this.app.post('/callback', (req, res) => {
      const event = req.body;
      this.events.push(event);
      
      // Resolve any pending promises
      while (this.resolvers.length > 0 && this.events.length > 0) {
        const resolver = this.resolvers.shift();
        if (resolver) resolver(this.events.shift());
      }
      
      res.status(200).send({ status: 'success' });
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.options.port, () => {
        console.log(`Callback server listening on port ${this.options.port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  waitForEvent(timeout = 10000): Promise<any> {
    if (this.events.length > 0) {
      return Promise.resolve(this.events.shift());
    }
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.resolvers.indexOf(resolve);
        if (index !== -1) {
          this.resolvers.splice(index, 1);
        }
        reject(new Error(`Timeout waiting for event after ${timeout}ms`));
      }, timeout);
      
      this.resolvers.push((event) => {
        clearTimeout(timeoutId);
        resolve(event);
      });
    });
  }
}