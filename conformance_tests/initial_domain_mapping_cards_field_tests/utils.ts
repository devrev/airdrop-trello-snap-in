import axios from 'axios';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_URL = 'http://localhost:8002';
export const DEVREV_SERVER_URL = 'http://localhost:8003';
export const WORKER_DATA_SERVER_URL = 'http://localhost:8003/external-worker';

// Environment variables
export const TRELLO_API_KEY = process.env.TRELLO_API_KEY || '';
export const TRELLO_TOKEN = process.env.TRELLO_TOKEN || '';
export const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID || '';
export const CHEF_CLI_PATH = process.env.CHEF_CLI_PATH || '';

// Test board and card IDs
export const TEST_BOARD_ID = '6752eb95c833e6b206fcf388';
export const TEST_CARD_ID = '688725fdf26b3c50430cae23';

// Function to create a basic event object for testing
export function createTestEvent(functionName: string, payload: Record<string, any> = {}) {
  return {
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token',
        actor_session_token: 'test-actor-token'
      }
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: functionName,
      event_type: 'test-event-type',
      devrev_endpoint: DEVREV_SERVER_URL
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

// Function to call the snap-in server
export async function callSnapInFunction(functionName: string, payload: Record<string, any> = {}) {
  const event = createTestEvent(functionName, payload);
  let response;
  try {
    response = await axios.post(SNAP_IN_SERVER_URL, event, {
      timeout: 10000, // 10 second timeout
    });
    
    // Check if response.data.function_result exists (this is the actual function return value)
    if (response.data && response.data.function_result) {
      return response.data.function_result;
    }
    return response.data; // Fallback to the entire response data
  } catch (error) {
    console.log('Full error:', error);
    console.error(`Error calling function ${functionName}:`, error);
    throw error;
  }
}

// Function to validate initial domain mapping with Chef CLI
export async function validateInitialDomainMapping(metadata: any, mapping: any): Promise<boolean> {
  if (!CHEF_CLI_PATH) {
    console.error('CHEF_CLI_PATH environment variable is not set');
    return false;
  }

  // Write metadata to a temporary file
  const metadataPath = path.join(__dirname, 'temp_metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  return new Promise((resolve, reject) => {
    const chefProcess = spawn(CHEF_CLI_PATH, ['initial-mapping', 'check', '-m', metadataPath]);
    
    let stdout = '';
    let stderr = '';

    // Send the mapping to stdin
    chefProcess.stdin.write(JSON.stringify(mapping));
    chefProcess.stdin.end();

    chefProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      console.log(chunk); // Print to console as required
    });

    chefProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      console.error(chunk); // Print to console as required
    });

    chefProcess.on('close', (code) => {
      // Clean up temporary file
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      if (code !== 0) {
        console.error(`Chef CLI process exited with code ${code}`);
        reject(new Error(`Chef CLI validation failed with exit code ${code}`));
        return;
      }

      if (!stdout.trim()) {
        console.error('Chef CLI returned empty output');
        reject(new Error('Chef CLI returned empty output'));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        if (!Array.isArray(result) || result.length === 0) {
          console.error('Chef CLI returned invalid output format');
          reject(new Error('Chef CLI returned invalid output format'));
          return;
        }

        const firstResult = result[0];
        if (!('RemainingDeficiencies' in firstResult) || !('Warnings' in firstResult)) {
          console.error('Chef CLI output missing required fields');
          reject(new Error('Chef CLI output missing required fields'));
          return;
        }

        if (firstResult.RemainingDeficiencies !== null || firstResult.Warnings !== null) {
          console.error('Chef CLI validation found deficiencies or warnings');
          reject(new Error('Chef CLI validation found deficiencies or warnings'));
          return;
        }

        resolve(true);
      } catch (error) {
        console.error('Failed to parse Chef CLI output:', error);
        reject(error);
      }
    });

    chefProcess.on('error', (error) => {
      console.error('Failed to start Chef CLI process:', error);
      reject(error);
    });
  });
}