import express from 'express';
import { Server } from 'http';

export class CallbackServer {
  private app: express.Express;
  private server: Server | null = null;
  private lastReceivedData: any = null;
  private port: number;

  constructor(port: number = 8002) {
    this.port = port;
    this.app = express();
    this.app.use(express.json());
    
    this.app.post('*', (req, res) => {
      this.lastReceivedData = req.body;
      res.status(200).send({ success: true });
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Callback server started on port ${this.port}`);
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

  getLastReceivedData(): any {
    return this.lastReceivedData;
  }

  resetData(): void {
    this.lastReceivedData = null;
  }
}