import axios from 'axios';
import express from 'express';
import { Server } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TestEnvironment {
  TRELLO_API_KEY: string;
  TRELLO_TOKEN: string;
  TRELLO_ORGANIZATION_ID: string;
  TRELLO_BASE_URL: string;
  CHEF_CLI_PATH?: string;
  EXTRACTED_FILES_FOLDER_PATH?: string;
}

export interface CallbackData {
  event_type: string;
  data?: any;
  error?: any;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class TestUtils {
  private static callbackServer: Server | null = null;
  private static callbackData: CallbackData[] = [];

  static getEnvironment(): TestEnvironment {
    const env = {
      TRELLO_API_KEY: process.env.TRELLO_API_KEY,
      TRELLO_TOKEN: process.env.TRELLO_TOKEN,
      TRELLO_ORGANIZATION_ID: process.env.TRELLO_ORGANIZATION_ID,
      TRELLO_BASE_URL: process.env.TRELLO_BASE_URL || 'https://api.trello.com/1',
      CHEF_CLI_PATH: process.env.CHEF_CLI_PATH,
      EXTRACTED_FILES_FOLDER_PATH: process.env.EXTRACTED_FILES_FOLDER_PATH
    };

    if (!env.TRELLO_API_KEY || !env.TRELLO_TOKEN || !env.TRELLO_ORGANIZATION_ID) {
      throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
    }

    return env as TestEnvironment;
  }

  static async setupCallbackServer(): Promise<void> {
    return new Promise((resolve) => {
      const app = express();
      app.use(express.json());
      
      app.post('/callback', (req, res) => {
        this.callbackData.push(req.body);
        res.status(200).send('OK');
      });

      this.callbackServer = app.listen(8002, () => {
        resolve();
      });
    });
  }

  static async teardownCallbackServer(): Promise<void> {
    if (this.callbackServer) {
      return new Promise((resolve) => {
        this.callbackServer!.close(() => {
          this.callbackServer = null;
          resolve();
        });
      });
    }
  }

  static clearCallbackData(): void {
    this.callbackData = [];
  }

  static getCallbackData(): CallbackData[] {
    return [...this.callbackData];
  }

  static createBaseEvent(env: TestEnvironment, eventType: string, additionalData: any = {}): any {
    return {
      payload: {
        connection_data: {
          org_id: env.TRELLO_ORGANIZATION_ID,
          org_name: "Test Organization",
          key: `key=${env.TRELLO_API_KEY}&token=${env.TRELLO_TOKEN}`,
          key_type: "oauth"
        },
        event_context: {
          callback_url: "http://localhost:8002/callback",
          dev_org: "test-org",
          dev_org_id: "test-org-id",
          dev_user: "test-user",
          dev_user_id: "test-user-id",
          external_sync_unit: "688725dad59c015ce052eecf",
          external_sync_unit_id: "688725dad59c015ce052eecf",
          external_sync_unit_name: "Test Board",
          external_system: "trello",
          external_system_type: "trello",
          import_slug: "test-import",
          mode: "INITIAL",
          request_id: "test-request-id",
          snap_in_slug: "trello-snap-in",
          snap_in_version_id: "test-version-id",
          sync_run: "test-sync-run",
          sync_run_id: "test-sync-run-id",
          sync_tier: "test-tier",
          sync_unit: "test-sync-unit",
          sync_unit_id: "test-sync-unit-id",
          uuid: "test-uuid",
          worker_data_url: "http://localhost:8003/external-worker"
        },
        event_type: eventType,
        event_data: additionalData
      },
      context: {
        dev_oid: "test-dev-oid",
        source_id: "test-source-id",
        snap_in_id: "test-snap-in-id",
        snap_in_version_id: "test-version-id",
        service_account_id: "test-service-account-id",
        secrets: {
          service_account_token: "test-token"
        }
      },
      execution_metadata: {
        request_id: "test-request-id",
        function_name: "extraction",
        event_type: "extraction",
        devrev_endpoint: "http://localhost:8003"
      },
      input_data: {
        global_values: {},
        event_sources: {}
      }
    };
  }

  static async sendEventToSnapIn(event: any): Promise<any> {
    try {
      const response = await axios.post('http://localhost:8000/handle/sync', event, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Snap-in request failed: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
      }
      throw error;
    }
  }

  /**
   * Start rate limiting for a specific test
   * @param testName Identifier for the test
   */
  static async startRateLimiting(testName: string): Promise<void> {
    try {
      const response = await axios.post('http://localhost:8004/start_rate_limiting', {
        test_name: testName
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`Rate limiting start request failed with status ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to start rate limiting: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
      }
      throw new Error(`Failed to start rate limiting: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * End rate limiting
   */
  static async endRateLimiting(): Promise<void> {
    try {
      const response = await axios.post('http://localhost:8004/end_rate_limiting', {}, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`Rate limiting end request failed with status ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to end rate limiting: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
      }
      throw new Error(`Failed to end rate limiting: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if a file exists
   * @param filePath Path to the file
   * @returns Promise resolving to true if file exists, false otherwise
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists
   * @param dirPath Path to the directory
   * @returns Promise resolving to true if directory exists, false otherwise
   */
  static async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Create a temporary file with specified content
   * @param prefix File name prefix
   * @param suffix File name suffix (including extension)
   * @param content File content
   * @returns Promise resolving to the temporary file path
   */
  static async createTempFile(prefix: string, suffix: string, content: string): Promise<string> {
    const tempDir = os.tmpdir();
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${suffix}`;
    const filePath = path.join(tempDir, fileName);
    
    try {
      await fs.promises.writeFile(filePath, content, 'utf8');
      return filePath;
    } catch (error) {
      throw new Error(`Failed to create temporary file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a file
   * @param filePath Path to the file to delete
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a shell command
   * @param command Command to execute
   * @returns Promise resolving to command result
   */
  static async executeCommand(command: string): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await execAsync(command);
      return {
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: 0
      };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        exitCode: error.code || 1
      };
    }
  }

  /**
   * Execute a shell command with stdin from a file
   * @param command Command to execute
   * @param inputFilePath Path to file to use as stdin
   * @returns Promise resolving to command result
   */
  static async executeCommandWithStdin(command: string, inputFilePath: string): Promise<CommandResult> {
    const fullCommand = `cat "${inputFilePath}" | ${command}`;
    return this.executeCommand(fullCommand);
  }
}