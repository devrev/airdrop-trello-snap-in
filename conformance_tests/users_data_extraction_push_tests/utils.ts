import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Types
export interface Context {
  dev_oid: string;
  source_id: string;
  snap_in_id: string;
  snap_in_version_id: string;
  service_account_id: string;
  secrets: Record<string, string>;
}

export interface ExecutionMetadata {
  request_id: string;
  function_name: string;
  event_type: string;
  devrev_endpoint: string;
}

export interface InputData {
  global_values: Record<string, string>;
  event_sources: Record<string, string>;
}

export interface EventContext {
  callback_url: string;
  dev_org: string;
  dev_org_id: string;
  dev_user: string;
  dev_user_id: string;
  external_sync_unit: string;
  external_sync_unit_id: string;
  external_sync_unit_name: string;
  external_system: string;
  external_system_type: string;
  import_slug: string;
  mode: string;
  request_id: string;
  snap_in_slug: string;
  snap_in_version_id: string;
  sync_run: string;
  sync_run_id: string;
  sync_tier: string;
  sync_unit: string;
  sync_unit_id: string;
  uuid: string;
  worker_data_url: string;
}

export interface ConnectionData {
  org_id: string;
  org_name: string;
  key: string;
  key_type: string;
}

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;
export const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Helper functions
export function createExtractionEvent(eventType: string, initialState: any = {}) {
  // Get Trello credentials from environment variables
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;

  if (!trelloApiKey || !trelloToken || !trelloOrgId) {
    throw new Error('Missing required environment variables: TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID');
  }

  return {
    payload: {
      event_type: eventType,
      connection_data: {
        org_id: trelloOrgId,
        org_name: 'Test Organization',
        key: `key=${trelloApiKey}&token=${trelloToken}`,
        key_type: 'api_key'
      },
      event_context: {
        callback_url: `${CALLBACK_SERVER_URL}/callback`,
        dev_org: 'dev_org',
        dev_org_id: 'dev_org_id',
        dev_user: 'dev_user',
        dev_user_id: 'dev_user_id',
        external_sync_unit: 'external_sync_unit',
        external_sync_unit_id: '688725dad59c015ce052eecf', // Board ID for testing
        external_sync_unit_name: 'Test Board',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'import_slug',
        mode: 'INITIAL',
        request_id: 'request_id',
        snap_in_slug: 'snap_in_slug',
        snap_in_version_id: 'snap_in_version_id',
        sync_run: 'sync_run',
        sync_run_id: 'sync_run_id',
        sync_tier: 'sync_tier',
        sync_unit: 'sync_unit',
        sync_unit_id: 'sync_unit_id',
        uuid: 'uuid',
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      state: initialState
    },
    context: {
      dev_oid: 'dev_oid',
      source_id: 'source_id',
      snap_in_id: 'snap_in_id',
      snap_in_version_id: 'snap_in_version_id',
      service_account_id: 'service_account_id',
      secrets: {
        service_account_token: 'service_account_token'
      }
    },
    execution_metadata: {
      request_id: `req_${Date.now()}`,
      function_name: 'extraction',
      event_type: 'event',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Server for receiving callbacks
export function createCallbackServer(): Promise<{ server: Server; receivedEvents: any[] }> {
  return new Promise((resolve) => {
    const app = express();
    app.use(bodyParser.json());
    
    const receivedEvents: any[] = [];
    
    app.post('/callback', (req, res) => {
      console.log('Received callback:', JSON.stringify(req.body, null, 2));
      receivedEvents.push(req.body);
      res.status(200).send();
    });
    
    const server = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server listening on port ${CALLBACK_SERVER_PORT}`);
      resolve({ server, receivedEvents });
    });
  });
}

// Function to send event to snap-in
export async function sendEventToSnapIn(event: any): Promise<any> {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, event, {
      // Set a reasonable timeout to avoid hanging tests
      timeout: 10000,
      // Handle non-200 responses without throwing
      validateStatus: (status) => {
        return status >= 200 && status < 500;
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending event to snap-in:', error);
    throw error;
  }
}

// Execute a shell command and return the result
export function executeCommand(command: string): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error && error.code === undefined) {
        reject(error);
        return;
      }
      
      resolve({
        stdout,
        stderr,
        exitCode: error && typeof error.code === 'number' ? error.code : 0
      });
    });
  });
}

// Find the latest extracted file matching a pattern
export async function findLatestExtractedFile(folderPath: string, filePattern: string): Promise<string | null> {
  try {
    const { stdout, stderr, exitCode } = await executeCommand(
      `ls ${folderPath} | grep ${filePattern} | sort -r | head -n 1`
    );
    
    if (exitCode !== 0 || !stdout.trim()) {
      console.error(`Error finding latest extracted file: ${stderr}`);
      return null;
    }
    
    const fileName = stdout.trim();
    return path.join(folderPath, fileName);
  } catch (error) {
    console.error('Error executing find command:', error);
    return null;
  }
}

// Run Chef CLI validation
export async function runChefCliValidation(
  chefCliPath: string,
  metadataPath: string,
  recordType: string,
  extractedFilePath: string
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  // Read the extracted file
  const extractedData = fs.readFileSync(extractedFilePath, 'utf8');
  
  // Create a temporary script to pipe the data to Chef CLI
  const tempScriptPath = path.resolve(__dirname, `./temp_validation_script_${Date.now()}.sh`);
  const scriptContent = `#!/bin/bash
set -e
echo "Running Chef CLI validation with:"
echo "Metadata path: ${metadataPath}"
echo "Record type: ${recordType}"
echo "Data length: $(echo '${extractedData}' | wc -c) bytes"

cat << 'EOF' | ${chefCliPath} validate-data -m ${metadataPath} -r ${recordType}
${extractedData}
EOF
`;
  console.log(`Created validation script at ${tempScriptPath}`);
  fs.writeFileSync(tempScriptPath, scriptContent);
  fs.chmodSync(tempScriptPath, '755'); // Make executable
  
  try {
    // Execute the script
    const result = await executeCommand(tempScriptPath);
    return result;
  } catch (error) {
    console.error(`Error executing Chef CLI validation: ${error}`);
    throw error;
  } finally {
    // Clean up
    if (fs.existsSync(tempScriptPath)) {
      fs.unlinkSync(tempScriptPath);
    }
  }
}