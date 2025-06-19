import axios, { AxiosRequestConfig } from 'axios';
import { Server } from 'http';
import express, { Express } from 'express';
import http from 'http';
import bodyParser from 'body-parser';

/**
 * Creates a robust axios instance with retry logic and proper connection handling
 */
export function createRobustAxiosInstance() {
  return axios.create({
    timeout: 60000, // 60 seconds
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    decompress: true,
    validateStatus: function (status) {
      // Consider any status as valid to handle in our code
      return true;
    },
    // Properly close connections after each request
    httpAgent: new http.Agent({ 
      keepAlive: false,
      maxSockets: 1
    }),
    headers: {
      'Connection': 'close'
    },
    headers: {
      'Connection': 'close'
    },
    httpAgent: new (require('http').Agent)({ keepAlive: false })
  });
}

/**
 * Creates a callback server for testing
 * 
 * @param port - The port to listen on
 * @param callbackPath - The path to listen for callbacks on
 * @returns An object containing the server and received events
 */
export function createCallbackServer(port: number, callbackPath: string = '/callback') {
  const app = express();
  const receivedEvents: any[] = [];
  
  app.use(bodyParser.json({ limit: '50mb' }));
  
  app.post(callbackPath, (req, res) => {
    console.log(`Received callback event with type: ${req.body.event_type}`);
    receivedEvents.push(req.body);
    console.log(`Total events received: ${receivedEvents.length}`);
    res.status(200).send('OK');
  });
  
  return new Promise<{ server: Server, events: any[] }>((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Callback server listening on port ${port}`);
      resolve({ server, events: receivedEvents });
    });
  });
}

/**
 * Waits for a specific event type to be received
 * 
 * @param events - The array of received events
 * @param eventType - The event type to wait for
 * @param timeout - The maximum time to wait in milliseconds
 * @returns True if the event was received, false otherwise
 */
export async function waitForEvent(events: any[], eventType: string, timeout: number = 60000): Promise<boolean> {
  const checkInterval = 1000; // 1 second
  let waitTime = 0; 

  while (waitTime < timeout) {
    if (events.some(event => event.event_type === eventType)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    waitTime += checkInterval;
    console.log(`Waiting for ${eventType} event... (${waitTime}ms elapsed)`);
  }

  return false; 
}

/**
 * Creates a test event payload
 * 
 * @param eventType - The event type
 * @param apiKey - The Trello API key
 * @param token - The Trello token
 * @param orgId - The Trello organization ID
 * @param externalSyncUnitId - The external sync unit ID
 * @param callbackUrl - The callback URL
 * @returns The event payload
 */
export function createEventPayload(
  eventType: string,
  apiKey: string,
  token: string,
  orgId: string,
  externalSyncUnitId: string = '6752eb962a64828e59a35396',
  callbackUrl: string = 'http://localhost:8002/callback'
) {
  return {
    execution_metadata: {
      function_name: 'extraction',
      devrev_endpoint: 'http://localhost:8003'
    },
    context: {
      secrets: {
        service_account_token: 'test-token'
      }
    },
    payload: {
      event_type: eventType,
      connection_data: {
        key: `key=${apiKey}&token=${token}`,
        org_id: orgId,
        org_name: "Trello Organization"
      },
      event_context: {
        callback_url: callbackUrl,
        external_sync_unit_id: externalSyncUnitId,
        external_sync_unit: "Test Board",
        sync_unit_id: "984c894e-71e5-4e94-b484-40b839c9a916",
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_data: {}
    },
    input_data: {}
  };
}