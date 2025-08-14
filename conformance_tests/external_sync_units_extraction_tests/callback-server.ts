import express from 'express';
import { CallbackEvent } from './types';

export class CallbackServer {
  private app = express();
  private server: any;
  private callbackEvents: CallbackEvent[] = [];
  private port = 8002;

  constructor() {
    this.app.use(express.json());
    
    this.app.post('/callback', (req, res) => {
      const event = req.body as CallbackEvent;
      console.log('Received callback event:', event);
      this.callbackEvents.push(event);
      res.status(200).send('OK');
    });
  }

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Callback server listening on port ${this.port}`);
        setTimeout(resolve, 100); // Give the server a moment to fully initialize
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        try {
          this.server.close(() => {
            console.log('Callback server stopped');
            resolve();
          });
        } catch (e) { resolve(); }
      } else {
        resolve();
      }
    });
  }

  public getCallbackEvents(): CallbackEvent[] {
    return this.callbackEvents;
  }

  public clearCallbackEvents(): void {
    this.callbackEvents = [];
  }

  public waitForCallbackEvent(eventType: string, timeoutMs = 5000): Promise<CallbackEvent> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkForEvent = () => {
        const event = this.callbackEvents.find(e => e.event_type === eventType);
        if (event) {
          resolve(event);
          return;
        }
        
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Timeout waiting for callback event of type ${eventType}`));
          return;
        }
        
        setTimeout(checkForEvent, 100);
      };
      
      checkForEvent();
    });
  }
}