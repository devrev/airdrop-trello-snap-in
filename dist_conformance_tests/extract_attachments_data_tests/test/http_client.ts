import * as http from 'http';
import express, { Request, Response } from 'express';
import axios from 'axios';
import { Server } from 'http';
import * as zlib from 'zlib';
import * as fs from 'fs';

export interface CallbackServer {
  server: http.Server;
  port: number;
  receivedEvents: any[];
  eventPromise: Promise<any> | null;
  eventResolve: ((value: any) => void) | null;
}

/**
 * Setup callback server to receive events from snap-in
 */
export async function setupCallbackServer(port: number): Promise<CallbackServer> {
  const app = express();
  app.use(express.json());

  const callbackServer: CallbackServer = {
    server: null as any,
    port,
    receivedEvents: [],
    eventPromise: null,
    eventResolve: null,
  };

  // Setup callback endpoint
  app.post('/callback', (req: Request, res: Response) => {
    const event = req.body;
    callbackServer.receivedEvents.push(event);
    
    // Resolve promise if waiting
    if (callbackServer.eventResolve) {
      callbackServer.eventResolve(event);
      callbackServer.eventResolve = null;
      callbackServer.eventPromise = null;
    }
    
    res.status(200).json({ success: true });
  });

  // Start server
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      callbackServer.server = server;
      resolve(callbackServer);
    });

    server.on('error', (error: Error) => {
      reject(error);
    });
  });
}

/**
 * Send event to snap-in server
 */
export async function sendEventToSnapIn(url: string, event: any): Promise<void> {
  try {
    await axios.post(url, event, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to send event to snap-in: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Wait for callback event from snap-in
 */
export async function waitForCallback(
  callbackServer: CallbackServer,
  timeoutMs: number
): Promise<any> {
  // Check if event already received
  if (callbackServer.receivedEvents.length > 0) {
    return callbackServer.receivedEvents[callbackServer.receivedEvents.length - 1];
  }

  // Create promise to wait for event
  const eventPromise = new Promise<any>((resolve, reject) => {
    callbackServer.eventResolve = resolve;

    // Setup timeout
    const timeoutId = setTimeout(() => {
      callbackServer.eventResolve = null;
      callbackServer.eventPromise = null;
      reject(new Error(`Timeout waiting for callback event after ${timeoutMs}ms`));
    }, timeoutMs);

    // Clear timeout when resolved
    const originalResolve = callbackServer.eventResolve;
    callbackServer.eventResolve = (value: any) => {
      clearTimeout(timeoutId);
      originalResolve!(value);
    };
  });

  callbackServer.eventPromise = eventPromise;
  return eventPromise;
}

/**
 * Cleanup callback server
 */
export async function cleanupCallbackServer(callbackServer: CallbackServer): Promise<void> {
  if (callbackServer.server) {
    return new Promise((resolve) => {
      callbackServer.server.close(() => {
        resolve();
      });
    });
  }
}

/**
 * Decompress a gzip file and return the content
 */
export function decompressGzipFile(filePath: string): string {
  try {
    const compressedContent = fs.readFileSync(filePath);
    const decompressedContent = zlib.gunzipSync(compressedContent);
    return decompressedContent.toString('utf-8');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to decompress gzip file ${filePath}: ${error.message}`);
    }
    throw new Error(`Failed to decompress gzip file ${filePath}: Unknown error`);
  }
}