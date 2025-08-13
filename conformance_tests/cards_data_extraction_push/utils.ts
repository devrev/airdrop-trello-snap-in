import axios from 'axios';
import dotenv from 'dotenv';
import express from 'express';
import { Server } from 'http';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Load environment variables
dotenv.config();

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_URL = 'http://localhost:8002';
export const CALLBACK_SERVER_PATH = '/callback';
export const DEVREV_SERVER_URL = 'http://localhost:8003';
export const WORKER_DATA_SERVER_URL = `${DEVREV_SERVER_URL}/external-worker`;

// Environment variables with fallback mock values for testing
export const TRELLO_API_KEY = process.env.TRELLO_API_KEY || 'mock-api-key';
export const TRELLO_TOKEN = process.env.TRELLO_TOKEN || 'mock-token';
export const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID || '';
export const TEST_BOARD_ID = '6752eb962a64828e59a35396'; // Board ID for testing

// Check if required environment variables are set
export function validateEnvironment(): void {
  if (!TRELLO_API_KEY) throw new Error('TRELLO_API_KEY environment variable is not set');
  if (!TRELLO_TOKEN) throw new Error('TRELLO_TOKEN environment variable is not set');
  if (!TRELLO_ORGANIZATION_ID) console.warn('TRELLO_ORGANIZATION_ID environment variable is not set, using default');
}

// Create a basic event payload
export function createEventPayload(eventType: string, additionalData: Record<string, any> = {}): any {
  return {
    payload: {
      connection_data: {
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
        org_id: TRELLO_ORGANIZATION_ID,
        org_name: 'Test Organization'
      },
      event_context: {
        external_sync_unit_id: TEST_BOARD_ID,
        request_id: `req-${Date.now()}`,
        dev_org_id: 'don-12345',
        dev_user_id: 'devu-12345',
        callback_url: `${CALLBACK_SERVER_URL}${CALLBACK_SERVER_PATH}`,
        worker_data_url: WORKER_DATA_SERVER_URL
      },
      event_type: eventType,
      ...additionalData
    },
    context: {
      dev_oid: 'don-12345',
      source_id: 'source-12345',
      snap_in_id: 'snap-12345',
      snap_in_version_id: 'snap-ver-12345',
      service_account_id: 'svc-12345',
      secrets: {
        service_account_token: 'test-token-12345'
      }
    },
    execution_metadata: {
      request_id: `req-${Date.now()}`,
      function_name: 'extraction',
      event_type: 'event.function.invoke',
      devrev_endpoint: DEVREV_SERVER_URL
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Send event to the Snap-In Server
export async function sendEventToSnapIn(event: any): Promise<any> {
  try {
    console.log(`Sending event to ${SNAP_IN_SERVER_URL}`);
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    console.log('Response received from snap-in server');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      throw new Error(`Failed to send event to Snap-In Server: ${error.message}`);
    }
    console.error('Unknown error:', error);
    throw error;
  }
}

// Mock sending event to the Snap-In Server
export async function mockSendEventToSnapIn(event: any): Promise<any> {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, event);
    return response.data;
  } catch (error) {
    console.error('Error in mockSendEventToSnapIn:', error);
    throw error;
  }
}

// Setup a callback server to receive events from DevRev
export function setupCallbackServer(port: number = 8002): { server: Server; events: any[] } {
  const app = express();
  app.use(bodyParser.json());
  
  // Array to store received events
  const receivedEvents: any[] = [];
  
  // Callback endpoint
  app.post(CALLBACK_SERVER_PATH, (req, res) => {
    console.log('Received callback event:', JSON.stringify(req.body, null, 2));
    receivedEvents.push(req.body);
    res.status(200).send({ status: 'ok' });
  });
  
  // Start server
  const server = app.listen(port, () => {
    console.log(`Callback server listening on port ${port}`);
  });
  
  return { server, events: receivedEvents };
}

// Wait for a specific callback event
export async function waitForCallbackEvent(
  events: any[],
  expectedEventType: string,
  timeout: number = 30000
): Promise<any> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    // Check if event already exists
    const checkEvent = () => {
      const event = events.find(e => e.event_type === expectedEventType);
      if (event) {
        return resolve(event);
      }
      
      // Check timeout
      if (Date.now() - startTime > timeout) {
        return reject(new Error(`Timeout waiting for event type ${expectedEventType}. Received events: ${JSON.stringify(events)}`));
      }
      
      // Check again after delay
      setTimeout(checkEvent, 1000);
    };
    
    checkEvent();
  });
}

/**
 * Run a shell command and return the result
 * 
 * @param command The command to run
 * @returns Object containing stdout, stderr, and exit code
 */
export function runShellCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error && error.code === undefined) {
        // This is a serious error, not just a non-zero exit code
        return reject(new Error(`Failed to execute command: ${error.message}`));
      }
      
      resolve({
        stdout,
        stderr,
        exitCode: error ? error.code || 1 : 0
      });
    });
  });
}

/**
 * Find the most recent extraction file for a specific item type
 * 
 * @param folderPath Path to the folder containing extraction files
 * @param itemType Type of item (e.g., 'cards', 'users')
 * @returns Path to the most recent file or null if not found
 */
export async function findMostRecentExtractionFile(folderPath: string, itemType: string): Promise<string | null> {
  try {
    // Check if folder exists
    if (!fs.existsSync(folderPath)) {
      throw new Error(`Folder ${folderPath} does not exist`);
    }
    
    // Run command to find the most recent file
    const command = `ls "${folderPath}" | grep extractor_${itemType} | sort -r | head -n 1`;
    const { stdout, stderr, exitCode } = await runShellCommand(command);
    
    if (exitCode !== 0) {
      throw new Error(`Failed to find extraction file: ${stderr}`);
    }
    
    const fileName = stdout.trim();
    if (!fileName) {
      return null;
    }
    
    return path.join(folderPath, fileName);
  } catch (error) {
    console.error('Error finding extraction file:', error);
    throw error;
  }
}

/**
 * Save metadata to a temporary file
 * 
 * @param metadata Metadata object to save
 * @returns Path to the temporary file
 */
export async function saveMetadataToTempFile(metadata: any): Promise<string> {
  try {
    // Create temporary file
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `metadata_${Date.now()}.json`);
    
    // Write metadata to file
    fs.writeFileSync(tempFilePath, JSON.stringify(metadata, null, 2));
    
    return tempFilePath;
  } catch (error) {
    console.error('Error saving metadata to temporary file:', error);
    throw new Error(`Failed to save metadata to temporary file: ${error instanceof Error ? error.message : String(error)}`);
  }
}