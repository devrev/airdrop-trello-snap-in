import express, { Express } from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface CallbackEvent {
  event_type: string;
  event_data?: any;
}

export class CallbackServer {
  private app: Express;
  private server: Server | null = null;
  private receivedEvents: CallbackEvent[] = [];
  private port: number;

  constructor(port: number = 8002) {
    this.port = port;
    this.app = express();
    this.app.use(bodyParser.json());

    this.app.post('/callback', (req, res) => {
      this.receivedEvents.push(req.body);
      res.status(200).send({ success: true });
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getReceivedEvents(): CallbackEvent[] {
    return this.receivedEvents;
  }

  clearEvents(): void {
    this.receivedEvents = [];
  }

  async waitForEvent(
    eventType: string,
    timeoutMs: number = 30000
  ): Promise<CallbackEvent> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const event = this.receivedEvents.find((e) => e.event_type === eventType);
      if (event) {
        return event;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(
      `Timeout waiting for event ${eventType}. Received events: ${JSON.stringify(
        this.receivedEvents.map((e) => e.event_type)
      )}`
    );
  }
}

export function loadTestPayload(filename: string): any {
  const payloadPath = path.join(__dirname, '..', 'test-payloads', filename);
  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf-8'));

  // Replace placeholders with actual credentials
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!trelloApiKey || !trelloToken || !trelloOrgId) {
    throw new Error(
      'Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID'
    );
  }

  const connectionDataKey = `key=${trelloApiKey}&token=${trelloToken}`;
  payload.payload.connection_data.key = connectionDataKey;
  payload.payload.connection_data.org_id = trelloOrgId;

  return payload;
}

export async function invokeSnapIn(payload: any): Promise<any> {
  const response = await axios.post('http://localhost:8000/handle/sync', payload);
  return response.data;
}

export function findMostRecentFile(folderPath: string, pattern: string): string | null {
  if (!fs.existsSync(folderPath)) {
    return null;
  }

  const files = fs.readdirSync(folderPath);
  const matchingFiles = files.filter((file) => file.includes(pattern));

  if (matchingFiles.length === 0) {
    return null;
  }

  // Sort by modification time (most recent first)
  const sortedFiles = matchingFiles
    .map((file) => ({
      name: file,
      time: fs.statSync(path.join(folderPath, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  return path.join(folderPath, sortedFiles[0].name);
}

export async function triggerRateLimiting(testName: string): Promise<void> {
  try {
    const response = await axios.post('http://localhost:8004/start_rate_limiting', {
      test_name: testName,
    });
    
    if (response.status !== 200) {
      throw new Error(`Unexpected status code: ${response.status}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to trigger rate limiting: ${errorMessage}`);
  }
}

export interface ChefValidationResult {
  stdout: string;
  stderr: string;
}

/**
 * Execute Chef CLI validation for a given record type
 * @param chefCliPath Path to the Chef CLI executable
 * @param metadataPath Path to the external domain metadata JSON file
 * @param recordType The record type to validate (e.g., 'labels', 'users')
 * @param dataFilePath Path to the extracted data file (JSONL format)
 * @returns Object containing stdout and stderr from Chef CLI
 * @throws Error if Chef CLI execution fails
 */
export function executeChefValidation(
  chefCliPath: string,
  metadataPath: string,
  recordType: string,
  dataFilePath: string
): ChefValidationResult {
  try {
    // Construct the command with input redirection
    const command = `"${chefCliPath}" validate-data -m "${metadataPath}" -r ${recordType} < "${dataFilePath}"`;
    
    // Execute the command and capture output
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: output.trim(),
      stderr: '',
    };
  } catch (error: any) {
    // execSync throws an error if the command exits with non-zero status
    // We need to capture both stdout and stderr
    const stdout = error.stdout ? error.stdout.toString().trim() : '';
    const stderr = error.stderr ? error.stderr.toString().trim() : '';

    // If there's output, return it for analysis
    if (stdout || stderr) {
      return {
        stdout,
        stderr,
      };
    }

    // If no output, throw a descriptive error
    throw new Error(
      `Chef CLI execution failed. ` +
      `Command: "${chefCliPath}" validate-data -m "${metadataPath}" -r ${recordType} < "${dataFilePath}". ` +
      `Error: ${error.message}. ` +
      `Exit code: ${error.status || 'unknown'}`
    );
  }
}