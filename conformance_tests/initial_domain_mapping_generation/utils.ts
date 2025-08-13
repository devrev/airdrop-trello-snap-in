import axios, { AxiosResponse } from 'axios';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Server URLs
export const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_URL = 'http://localhost:8002';

// Environment variables
export const TRELLO_API_KEY = process.env.TRELLO_API_KEY || '';
export const TRELLO_TOKEN = process.env.TRELLO_TOKEN || '';
export const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID || '';
export const CHEF_CLI_PATH = process.env.CHEF_CLI_PATH || '';

// Check if required environment variables are set
export function checkEnvironmentVariables(): void {
  const requiredVars = [
    { name: 'TRELLO_API_KEY', value: TRELLO_API_KEY },
    { name: 'TRELLO_TOKEN', value: TRELLO_TOKEN },
    { name: 'TRELLO_ORGANIZATION_ID', value: TRELLO_ORGANIZATION_ID },
    { name: 'CHEF_CLI_PATH', value: CHEF_CLI_PATH }
  ];

  const missingVars = requiredVars.filter(v => !v.value);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.map(v => v.name).join(', ')}`);
  }
}

// Create a basic event object for function invocation
export function createBasicEvent(functionName: string, payload: Record<string, any> = {}): Record<string, any> {
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
      ...payload
    }
  };
}

// Send a request to the test server
export async function invokeFunction(event: Record<string, any>): Promise<AxiosResponse> {
  try {
    return await axios.post(TEST_SERVER_URL, event, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error invoking function:', error);
    throw error;
  }
}

// Validate initial domain mappings with Chef CLI
export function validateWithChefCli(
  initialMappings: Record<string, any>, 
  externalDomainMetadataPath: string
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!CHEF_CLI_PATH) {
      reject(new Error('CHEF_CLI_PATH environment variable is not set'));
      return;
    }

    const chefProcess = spawn(
      CHEF_CLI_PATH, 
      ['initial-mapping', 'check', '-m', externalDomainMetadataPath]
    );

    let stdout = '';
    let stderr = '';

    chefProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    chefProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    chefProcess.stdin.write(JSON.stringify(initialMappings));
    chefProcess.stdin.end();

    chefProcess.on('close', (code) => {
      console.log('Chef CLI stdout:', stdout);
      console.log('Chef CLI stderr:', stderr);

      if (code !== 0) {
        reject(new Error(`Chef CLI exited with code ${code}\nStderr: ${stderr}`));
        return;
      }

      if (!stdout.trim()) {
        reject(new Error('Chef CLI returned empty output'));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse Chef CLI output: ${error}`));
      }
    });
  });
}