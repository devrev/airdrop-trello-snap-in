import axios from 'axios';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Server URLs
export const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';

// Environment variables
export const TRELLO_API_KEY = process.env.TRELLO_API_KEY || '';
export const TRELLO_TOKEN = process.env.TRELLO_TOKEN || '';
export const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID || '';
export const CHEF_CLI_PATH = process.env.CHEF_CLI_PATH || '';

// Test board ID
export const TEST_BOARD_ID = '6752eb962a64828e59a35396';

// Function to create a basic event object for function calls
export function createFunctionEvent(functionName: string, payload: Record<string, any> = {}) {
  return {
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token'
      }
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: functionName,
      event_type: 'test-event-type',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    },
    payload: {
      connection_data: {
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
        org_id: TRELLO_ORGANIZATION_ID
      },
      event_context: {
        external_sync_unit_id: TEST_BOARD_ID
      },
      ...payload
    }
  };
}

// Function to call the test server
export async function callTestServer(event: any) {
  try {
    const response = await axios.post(TEST_SERVER_URL, event);
    return response.data;
  } catch (error) {
    console.error('Error calling test server:', error);
    throw error;
  }
}

// Function to validate initial domain mappings using Chef CLI
export async function validateWithChefCli(metadata: any, mappings: any): Promise<any> {
  if (!CHEF_CLI_PATH) {
    throw new Error('CHEF_CLI_PATH environment variable is not set');
  }

  // Write metadata to a temporary file
  const metadataPath = path.join(__dirname, 'temp_metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  return new Promise((resolve, reject) => {
    const chefProcess = spawn(CHEF_CLI_PATH, ['initial-mapping', 'check', '-m', metadataPath]);
    
    let stdout = '';
    let stderr = '';

    // Send mappings to stdin
    chefProcess.stdin.write(JSON.stringify(mappings));
    chefProcess.stdin.end();

    // Collect stdout
    chefProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // Collect stderr
    chefProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle process completion
    chefProcess.on('close', (code) => {
      // Clean up temporary file
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      console.log('Chef CLI stdout:', stdout);
      console.log('Chef CLI stderr:', stderr);

      if (code !== 0) {
        reject(new Error(`Chef CLI exited with code ${code}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error('Failed to parse Chef CLI output'));
      }
    });
  });
}