import express from 'express';
import bodyParser from 'body-parser';

export interface CallbackData {
  event_type?: string;
  event_context?: Record<string, any>;
  event_data?: {
    external_sync_units?: any[];
    error?: {
      message: string;
    };
    progress?: number;
    artifacts?: any[];
  };
}

export class CallbackServer {
  private app = express();
  private server: any;
  private callbackData: CallbackData[] = [];
  private port: number;

  constructor(port: number = 8002) {
    this.port = port;
    this.app.use(bodyParser.json());
    
    this.app.post('/callback', (req, res) => {
      const body = req.body;
      console.debug('Received callback:', JSON.stringify(body, null, 2).substring(0, 500) + '...');
      
      // Log the event_type to help with debugging
      if (body && body.event_type) {
        console.debug(`Received callback with event_type: ${body.event_type}`); 
        
        // Log the structure of the event_data if it exists
        if (body.event_data) {
          console.debug('Event data structure:', Object.keys(body.event_data));
          console.debug('Has external_sync_units:', body.event_data.hasOwnProperty('external_sync_units'));
        }
      }
      this.callbackData.push(req.body);
      res.status(200).send({ status: 'ok' });
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.debug(`Callback server listening on port ${this.port}`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        console.debug('No server to stop');
        return resolve();
      }
      
      console.debug('Stopping callback server...');
      
      // Force close connections if method exists
      if (typeof this.server.closeAllConnections === 'function') {
        this.server.closeAllConnections();
      }
      
      // Set a timeout to force close the server if it doesn't close gracefully
      const forceCloseTimeout = setTimeout(() => {
        console.debug('Force closing server after timeout');
        resolve();
      }, 3000);
      
      this.server.close((err?: Error) => {
        clearTimeout(forceCloseTimeout);
        if (err) {
          console.debug('Error stopping server:', err);
          reject(err);
        } else {
          console.debug('Server stopped successfully');
          resolve();
        }
      });
    });
  }

  public getCallbackData(): CallbackData[] {
    return this.callbackData;
  }

  public clearCallbackData(): void {
    this.callbackData = [];
  }
}