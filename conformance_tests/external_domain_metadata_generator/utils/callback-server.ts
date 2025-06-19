import express from 'express';
import { Server } from 'http';
import { Socket } from 'net';

export class CallbackServer {
  private app: express.Express;
  private server: Server | null = null;
  private callbackData: any[] = [];

  // Track open connections to ensure proper cleanup
  private connections: Set<Socket> = new Set();

  constructor(private port: number = 8002) {
    this.app = express();
    this.app.use(express.json());

    this.app.post('*', (req, res) => {
      this.callbackData.push(req.body);
      res.status(200).send({ success: true });
    });
  }

  /**
   * Starts the callback server
   */
  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Callback server listening on port ${this.port}`);
        resolve();
        
        // Track connections to ensure proper cleanup
        if (this.server) {
          this.server.on('connection', (conn: Socket) => {
            this.connections.add(conn);
            conn.on('close', () => {
              this.connections.delete(conn);
            });
          });
        }
      });
    });
  }

  /**
   * Stops the callback server
   */
  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve(); 
        return;
      }

      // Close all open connections
      for (const conn of this.connections) {
        conn.destroy();
      }
      
      this.connections.clear();
      
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

  /**
   * Gets the data received by the callback server
   */
  public getCallbackData(): any[] {
    return this.callbackData;
  }

  /**
   * Clears the callback data
   */
  public clearCallbackData(): void {
    this.callbackData = [];
  }

  /**
   * Gets the callback URL
   */
  public getCallbackUrl(): string {
    return `http://localhost:${this.port}/callback`;
  }
}