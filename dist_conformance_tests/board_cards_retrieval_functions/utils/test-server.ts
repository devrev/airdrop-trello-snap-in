import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';

export interface CallbackServerOptions {
  port: number;
}

export class CallbackServer {
  private server: Server | null = null;
  private app = express();
  private callbacks: Record<string, (data: any) => void> = {};

  constructor(private options: CallbackServerOptions) {
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: false }));

    this.app.post('*', (req, res) => {
      const path = req.path;
      const callback = this.callbacks[path];
      
      if (callback) {
        callback(req.body);
      }
      
      res.status(200).send();
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.options.port, () => {
        console.log(`Callback server running at http://localhost:${this.options.port}`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        return resolve();
      }
      
      this.server.close((err) => {
        if (err) {
          return reject(err);
        }
        this.server = null;
        resolve();
      });
    });
  }

  public registerCallback(path: string, callback: (data: any) => void): void {
    this.callbacks[path] = callback;
  }
}