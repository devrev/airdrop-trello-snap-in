import express from 'express';
import { Server } from 'http';

export class CallbackServer {
  private app = express();
  private server: Server | null = null;
  private callbackData: any = null;
  private callbackPromise: Promise<any> | null = null;
  private resolveCallback: ((value: any) => void) | null = null;

  constructor(private port: number = 8002) {
    this.app.use(express.json());
    
    this.app.post('/callback', (req, res) => {
      this.callbackData = req.body;
      if (this.resolveCallback) {
        this.resolveCallback(this.callbackData);
      }
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
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.server = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  waitForCallback(timeoutMs: number = 30000): Promise<any> {
    if (this.callbackData) {
      const data = this.callbackData;
      this.callbackData = null;
      return Promise.resolve(data);
    }

    this.callbackPromise = new Promise((resolve, reject) => {
      this.resolveCallback = resolve;
      
      setTimeout(() => {
        if (this.resolveCallback === resolve) {
          this.resolveCallback = null;
          reject(new Error(`Callback timeout after ${timeoutMs}ms`));
        }
      }, timeoutMs);
    });

    return this.callbackPromise;
  }
}