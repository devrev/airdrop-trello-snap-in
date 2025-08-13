import express from 'express';
import { Server } from 'http';

export class CallbackServer {
  private app = express();
  private server: Server | null = null;
  private callbackData: any = null;
  private callbackReceived = false;

  constructor(private port: number = 8002) {
    this.app.use(express.json());
    
    this.app.post('/callback', (req, res) => {
      this.callbackData = req.body;
      this.callbackReceived = true;
      res.status(200).send();
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Callback server listening on port ${this.port}`);
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
        if (err) {
          reject(err);
        } else {
          this.server = null;
          resolve();
        }
      });
    });
  }

  waitForCallback(timeoutMs: number = 10000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.callbackReceived) {
        resolve(this.callbackData);
        return;
      }

      const checkInterval = 100;
      let elapsedTime = 0;
      
      const intervalId = setInterval(() => {
        if (this.callbackReceived) {
          clearInterval(intervalId);
          resolve(this.callbackData);
          return;
        }

        elapsedTime += checkInterval;
        if (elapsedTime >= timeoutMs) {
          clearInterval(intervalId);
          reject(new Error(`Callback not received within ${timeoutMs}ms`));
        }
      }, checkInterval);
    });
  }

  resetCallback(): void {
    this.callbackData = null;
    this.callbackReceived = false;
  }
}