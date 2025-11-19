import express, { Express, Request, Response } from 'express';
import { Server } from 'http';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface CallbackEvent {
  event_type: string;
  event_context?: any;
  event_data?: any;
  worker_metadata?: any;
}

export class CallbackServer {
  private app: Express;
  private server: Server | null = null;
  private events: CallbackEvent[] = [];
  private port: number;

  constructor(port: number = 8002) {
    this.port = port;
    this.app = express();
    this.app.use(express.json());

    this.app.post('/callback', (req: Request, res: Response) => {
      this.events.push(req.body);
      res.status(200).send({ status: 'ok' });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getEvents(): CallbackEvent[] {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }

  async waitForEvent(timeoutMs: number = 100000): Promise<CallbackEvent> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (this.events.length > 0) {
        return this.events[0];
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timeout waiting for callback event after ${timeoutMs}ms`);
  }
}

export async function sendEventToSnapIn(event: any): Promise<void> {
  await axios.post('http://localhost:8000/handle/sync', event, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function loadTestPayload(filename: string): any {
  const filePath = path.join(__dirname, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

export function replaceCredentials(payload: any): any {
  const apiKey = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  const orgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!apiKey || !token || !orgId) {
    throw new Error(
      'Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID'
    );
  }

  const payloadCopy = JSON.parse(JSON.stringify(payload));
  payloadCopy.payload.connection_data.key = `key=${apiKey}&token=${token}`;
  payloadCopy.payload.connection_data.org_id = orgId;

  return payloadCopy;
}

export function getExtractedFilesFolder(): string {
  const folderPath = process.env.EXTRACTED_FILES_FOLDER_PATH;
  if (!folderPath) {
    throw new Error('EXTRACTED_FILES_FOLDER_PATH environment variable is not set');
  }
  if (!fs.existsSync(folderPath)) {
    throw new Error(`Extracted files folder does not exist: ${folderPath}`);
  }
  return folderPath;
}

export function findMostRecentFile(folder: string, pattern: string): string {
  const files = fs.readdirSync(folder);
  const matchingFiles = files
    .filter((file) => file.includes(pattern))
    .sort()
    .reverse();

  if (matchingFiles.length === 0) {
    throw new Error(`No files matching pattern '${pattern}' found in ${folder}`);
  }

  return path.join(folder, matchingFiles[0]);
}

export function getChefCliPath(): string {
  const chefCliPath = process.env.CHEF_CLI_PATH;
  if (!chefCliPath) {
    throw new Error('CHEF_CLI_PATH environment variable is not set');
  }
  if (!fs.existsSync(chefCliPath)) {
    throw new Error(`Chef CLI executable does not exist: ${chefCliPath}`);
  }
  return chefCliPath;
}

export function readExtractedFile(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Extracted file does not exist: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.trim().split('\n').filter(line => line.trim() !== '');
}

export function getSampleData(filePath: string, lines: number = 3): string {
  const allLines = readExtractedFile(filePath);
  return allLines.slice(0, lines).join('\n');
}