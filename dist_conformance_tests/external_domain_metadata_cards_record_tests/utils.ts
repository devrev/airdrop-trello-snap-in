import axios from 'axios';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Constants
export const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_URL = 'http://localhost:8002';
export const DEVREV_SERVER_URL = 'http://localhost:8003';
export const WORKER_DATA_URL = `${DEVREV_SERVER_URL}/external-worker`;

// Environment variables - use functions to get current values
export const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
export const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
export const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;
export const CHEF_CLI_PATH = process.env.CHEF_CLI_PATH;

// Test board and card IDs
export const TEST_BOARD_ID = '6752eb95c833e6b206fcf388';
export const TEST_CARD_ID = '688725fdf26b3c50430cae23';

// Function to create a basic event payload
export function createEventPayload(functionName: string, payload: Record<string, any> = {}) {
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
      request_id: `test-request-${Date.now()}`,
      function_name: functionName,
      event_type: 'test-event',
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

// Function to call the test server
export async function callTestServer(functionName: string, payload: Record<string, any> = {}) {
  console.log(`Calling test server for function: ${functionName}`);
  const eventPayload = createEventPayload(functionName, payload);
  try {
    const response = await axios.post(TEST_SERVER_URL, eventPayload, {
      timeout: 10000, // 10 second timeout
      validateStatus: (status) => true // Accept any status code to handle errors properly
    });
    
    if (response.status !== 200) {
      console.error(`Server returned status ${response.status}`);
      throw {
        status: 'error',
        message: `Server returned status ${response.status}`,
        error: response.data
      };
    }
    
    console.log(`Received response for ${functionName}: ${JSON.stringify(response.data).substring(0, 200)}...`);
    
    // Extract function_result from the response
    if (response.data && response.data.function_result) {
      return response.data.function_result;
    } else {
      console.error(`Unexpected response structure: ${JSON.stringify(response.data)}`);
      throw new Error(`Unexpected response structure from server`);
    }
  } catch (error: any) {
    console.error(`Error response: ${error.response?.data ? JSON.stringify(error.response.data) : 'No response data'}`);
    console.error('Error calling test server:', error);
    throw error;
  }
}

// Function to validate metadata using Chef CLI
export function validateMetadataWithChefCLI(metadata: any): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Always use the current value from environment
    const currentChefCliPath = process.env.CHEF_CLI_PATH;
    if (!currentChefCliPath) {
      console.error('CHEF_CLI_PATH environment variable is not set');
      reject(new Error('CHEF_CLI_PATH environment variable is not set'));
      return;
    }

    console.log(`Using Chef CLI at path: ${currentChefCliPath}`);

    const chefProcess = spawn(currentChefCliPath, ['validate-metadata']);
    
    let stdout = '';
    let stderr = '';

    chefProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(`Chef CLI stdout: ${data}`);
    });

    chefProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(`Chef CLI stderr: ${data}`);
    });

    // Set a timeout for the Chef CLI process
    const timeout = setTimeout(() => {
      console.error('Chef CLI process timed out after 30 seconds');
      chefProcess.kill();
      reject(new Error('Chef CLI validation timed out after 30 seconds'));
    }, 30000);
    
    chefProcess.on('error', (err) => {
      clearTimeout(timeout);
      console.error(`Failed to start Chef CLI process: ${err.message}`);
      reject(new Error(`Failed to start Chef CLI process: ${err.message}`));
    });

    chefProcess.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        console.error(`Chef CLI process exited with code ${code}`);
        console.error(`Stdout: ${stdout}`);
        console.error(`Stderr: ${stderr}`);
        reject(new Error(`Chef CLI validation failed with code ${code}`));
        return;
      }

      // If there's any output, consider it a validation error
      if (stdout.trim() || stderr.trim()) {
        reject(new Error(`Chef CLI validation failed: ${stdout}\n${stderr}`));
        return;
      }

      resolve(true);
    });

    // Write metadata to stdin
    chefProcess.stdin.write(JSON.stringify(metadata));
    chefProcess.stdin.end();
  });
}