import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Environment variables
export const TRELLO_API_KEY = process.env.TRELLO_API_KEY || '';
export const TRELLO_TOKEN = process.env.TRELLO_TOKEN || '';
export const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID || '';
export const CHEF_CLI_PATH = process.env.CHEF_CLI_PATH || '';

// Server URLs
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;
export const CALLBACK_SERVER_URL = `http://localhost:${CALLBACK_SERVER_PORT}`;
export const DEVREV_SERVER_URL = 'http://localhost:8003';
export const WORKER_DATA_URL = `${DEVREV_SERVER_URL}/external-worker`;

// Test data
export const TEST_BOARD_ID = '688725dad59c015ce052eecf';
export const TEST_CARD_ID = '688725db990240b77167efef';
export const TEST_ATTACHMENT_ID = '68c2be83c413a1889bde83df';

// Create a base event template
export function createBaseEvent(functionName: string) {
  return {
    payload: {
      connection_data: {
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
        org_id: TRELLO_ORGANIZATION_ID,
        org_name: 'Test Organization'
      },
      event_context: {
        callback_url: CALLBACK_SERVER_URL,
        dev_org: 'dev_org_123',
        dev_org_id: 'dev_org_123',
        dev_user: 'dev_user_123',
        dev_user_id: 'dev_user_123',
        external_sync_unit: 'external_sync_unit_123',
        external_sync_unit_id: TEST_BOARD_ID,
        external_sync_unit_name: 'Test Board',
        external_system: 'trello',
        external_system_type: 'trello',
        import_slug: 'import_123',
        mode: 'INITIAL',
        request_id: 'request_123',
        snap_in_slug: 'trello-airdrop',
        snap_in_version_id: 'snap_in_version_123',
        sync_run: 'sync_run_123',
        sync_run_id: 'sync_run_123',
        sync_tier: 'tier_1',
        sync_unit: 'sync_unit_123',
        sync_unit_id: 'sync_unit_123',
        uuid: 'uuid_123',
        worker_data_url: WORKER_DATA_URL
      }
    },
    context: {
      dev_oid: 'dev_oid_123',
      source_id: 'source_id_123',
      snap_in_id: 'snap_in_id_123',
      snap_in_version_id: 'snap_in_version_id_123',
      service_account_id: 'service_account_id_123',
      secrets: {
        service_account_token: 'service_account_token_123'
      }
    },
    execution_metadata: {
      request_id: 'request_id_123',
      function_name: functionName,
      event_type: 'event_type_123',
      devrev_endpoint: DEVREV_SERVER_URL
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
}

// Setup callback server
export function setupCallbackServer() {
  const app = express();
  app.use(bodyParser.json());
  
  const server = app.listen(CALLBACK_SERVER_PORT, () => {
    console.log(`Callback server running at ${CALLBACK_SERVER_URL}`);
  });
  
  return {
    app,
    server,
    close: () => {
      server.close();
    }
  };
}

// Run Chef CLI to validate initial domain mapping
export async function validateInitialDomainMapping(
  initialDomainMapping: any, 
  externalDomainMetadataPath: string
): Promise<{ isValid: boolean, output: string }> {
  return new Promise((resolve) => {
    if (!CHEF_CLI_PATH) {
      console.error('CHEF_CLI_PATH environment variable is not set');
      resolve({ isValid: false, output: 'CHEF_CLI_PATH environment variable is not set' });
      return;
    }

    // Ensure we're using the correct mapping object
    const mappingToValidate = initialDomainMapping.mapping || initialDomainMapping;
    
    // Log the mapping being validated
    console.log('Validating mapping:', JSON.stringify(mappingToValidate, null, 2));

    const chefProcess = spawn(
      CHEF_CLI_PATH, 
      ['initial-mapping', 'check', '-m', externalDomainMetadataPath],
      { shell: true }
    );
    
    let stdout = '';
    let stderr = '';
    
    // Write the initial domain mapping to stdin
    chefProcess.stdin.write(JSON.stringify(mappingToValidate));
    chefProcess.stdin.end();
    
    chefProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`Chef CLI stdout: ${data}`);
    });
    
    chefProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`Chef CLI stderr: ${data}`);
    });
    
    chefProcess.on('close', (code) => {
      console.log(`Chef CLI process exited with code ${code}`);
      
      if (code !== 0 || !stdout) {
        resolve({ isValid: false, output: stderr || 'Empty output from Chef CLI' });
        return;
      }
      
      try {
        const parsedOutput = JSON.parse(stdout);
        
        if (!Array.isArray(parsedOutput) || parsedOutput.length === 0) {
          resolve({ isValid: false, output: 'Invalid output format from Chef CLI' });
          return;
        }
        
        const firstItem = parsedOutput[0];
        const isValid = 
          'RemainingDeficiencies' in firstItem && 
          'Warnings' in firstItem && 
          firstItem.RemainingDeficiencies === null && 
          firstItem.Warnings === null;
        
        resolve({ isValid, output: stdout });
      } catch (error) {
        resolve({ 
          isValid: false, 
          output: `Failed to parse Chef CLI output: ${error instanceof Error ? error.message : String(error)}` 
        });
      }
    });
  });
}

// Send request to snap-in server
export async function sendToSnapInServer(event: any) {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, event, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Check if response.data contains function_result
    if (response.data && response.data.function_result) {
      return response.data.function_result;
    }
    return response.data; // Fallback to the entire response data
  } catch (error) {
    throw error;
  }
}