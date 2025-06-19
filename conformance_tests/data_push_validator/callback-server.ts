import express from 'express';
import { Server } from 'http';

export interface CallbackData {
  timestamp: string;
  [key: string]: any;
}

export interface CallbackServerOptions {
  port: number;
  responseStatus?: number;
  responseDelay?: number;
}

export class CallbackServer {
  private app = express();
  private server: Server | null = null;
  private lastReceivedData: CallbackData | null = null;
  private callCount = 0;
  private responseStatus: number;
  private responseDelay: number;

  constructor(options: CallbackServerOptions) {
    this.responseStatus = options.responseStatus || 200;
    this.responseDelay = options.responseDelay || 0;

    this.app.use(express.json());
    
    this.app.post('*', (req, res) => {
      this.lastReceivedData = req.body;
      this.callCount++;
      
      if (this.responseDelay > 0) {
        setTimeout(() => {
          res.status(this.responseStatus).json({ success: this.responseStatus === 200 });
        }, this.responseDelay);
      } else {
        res.status(this.responseStatus).json({ success: this.responseStatus === 200 });
      }
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(8002, () => {
        console.log('Callback server started on port 8002');
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
      
      // Force close any remaining connections
      setTimeout(() => {
        if (this.server) {
          this.server.closeAllConnections();
          this.server = null;
          resolve();
        }
      }, 100);
    });
  }

  public getLastReceivedData(): CallbackData | null {
    return this.lastReceivedData;
  }

  public getCallCount(): number {
    return this.callCount;
  }

  public reset(): void {
    this.lastReceivedData = null;
    this.callCount = 0;
  }

  public setResponseStatus(status: number): void {
    this.responseStatus = status;
  }

  public setResponseDelay(delay: number): void {
    this.responseDelay = delay;
  }
}