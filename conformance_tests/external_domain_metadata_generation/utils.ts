import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Server URLs
export const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_URL = 'http://localhost:8002';
export const DEVREV_SERVER_URL = 'http://localhost:8003';

// Environment variables
export const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
export const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
export const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;
export const CHEF_CLI_PATH = process.env.CHEF_CLI_PATH;

// Test board ID
export const TEST_BOARD_ID = '6752eb962a64828e59a35396';

// Function to invoke a snap-in function
export async function invokeFunction(functionName: string, payload: Record<string, any> = {}) {
  const event = {
    payload: {
      connection_data: {
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
        org_id: TRELLO_ORGANIZATION_ID
      },
      event_context: {
        external_sync_unit_id: TEST_BOARD_ID
      },
      ...payload
    },
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
      devrev_endpoint: DEVREV_SERVER_URL
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  try {
    const response = await axios.post(TEST_SERVER_URL, event);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Failed to invoke function: ${error.message}`);
    }
    throw error;
  }
}

// Function to validate metadata with Chef CLI
export async function validateMetadataWithChefCLI(metadata: Record<string, any>): Promise<{ isValid: boolean, stdout: string, stderr: string }> {
  if (!CHEF_CLI_PATH) {
    throw new Error('CHEF_CLI_PATH environment variable is not set');
  }

  try {
    const metadataJson = JSON.stringify(metadata);
    const { stdout, stderr } = await execAsync(`echo '${metadataJson}' | ${CHEF_CLI_PATH} validate-metadata`);
    
    console.log('Chef CLI stdout:', stdout);
    console.log('Chef CLI stderr:', stderr);
    
    // If there's no output, validation is successful
    const isValid = stdout.trim() === '' && !stderr.includes('Error');
    
    return { isValid, stdout, stderr };
  } catch (error) {
    const err = error as { stdout?: string, stderr?: string };
    console.error('Chef CLI validation failed:', error);
    return { 
      isValid: false, 
      stdout: err.stdout || '', 
      stderr: err.stderr || `Failed to execute Chef CLI: ${error}` 
    };
  }
}