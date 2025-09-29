import express from 'express';
import { Server } from 'http';

export interface CallbackServerSetup {
  server: Server;
  port: number;
  receivedCallbacks: any[];
}

export function setupCallbackServer(): Promise<CallbackServerSetup> {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(express.json());
    
    const receivedCallbacks: any[] = [];
    
    app.post('*', (req, res) => {
      receivedCallbacks.push({
        path: req.path,
        body: req.body,
        headers: req.headers,
        timestamp: new Date().toISOString()
      });
      res.status(200).json({ received: true });
    });

    const server = app.listen(8002, () => {
      resolve({
        server,
        port: 8002,
        receivedCallbacks
      });
    });

    server.on('error', reject);
  });
}

export function teardownCallbackServer(setup: CallbackServerSetup): Promise<void> {
  return new Promise((resolve) => {
    setup.server.close(() => {
      // Give a small delay to ensure cleanup
      setTimeout(() => resolve(), 100);
    });
  });
}

export function waitForCallback(
  setup: CallbackServerSetup, 
  timeoutMs: number, 
  predicate: (callback: any) => boolean
): Promise<any | null> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkForCallback = () => {
      // Check existing callbacks
      const matchingCallback = setup.receivedCallbacks.find(predicate);
      if (matchingCallback) {
        resolve(matchingCallback);
        return;
      }
      
      // Check if timeout exceeded
      if (Date.now() - startTime >= timeoutMs) {
        resolve(null);
        return;
      }
      
      // Continue checking
      setTimeout(checkForCallback, 100);
    };
    
    checkForCallback();
  });
}