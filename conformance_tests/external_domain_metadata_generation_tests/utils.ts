import axios from 'axios';
import { spawn } from 'child_process';
import { createServer, Server } from 'http';

// Constants
export const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
export const CALLBACK_SERVER_PORT = 8002;

// Types
export interface FunctionResponse {
  status: string;
  message: string;
  metadata?: any;
  [key: string]: any;
}

// Helper function to make requests to the Snap-In Server
export async function callFunction(
  functionName: string, 
  payload: Record<string, any> = {}
): Promise<FunctionResponse> {
  try {
    const response = await axios.post(SNAP_IN_SERVER_URL, {
      // Ensure payload has at least connection_data to satisfy server requirements
      payload: {
        connection_data: {
          key: process.env.TRELLO_API_KEY ? `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}` : 'key=test-key&token=test-token',
          org_id: process.env.TRELLO_ORGANIZATION_ID || 'test-org-id'
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
          service_account_token: 'test-token',
          actor_session_token: 'test-actor-token'
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
      }
    });
    
    return response.data.function_result || response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Server responded with error:', error.response.data);
      throw new Error(`Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

// Helper function to validate metadata using Chef CLI
export async function validateMetadataWithChefCLI(metadata: any): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const chefCliPath = process.env.CHEF_CLI_PATH;
    
    if (!chefCliPath) {
      console.error('CHEF_CLI_PATH environment variable is not set');
      reject(new Error('CHEF_CLI_PATH environment variable is not set'));
      return;
    }
    
    const chefProcess = spawn(chefCliPath, ['validate-metadata']);
    let stdout = '';
    let stderr = '';
    
    chefProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(`Chef CLI stdout: ${data}`);
    });
    
    chefProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`Chef CLI stderr: ${data}`);
    });
    
    chefProcess.on('close', (code) => {
      if (code === 0 && stdout.trim() === '') {
        resolve(true);
      } else {
        reject(new Error(`Chef CLI validation failed with code ${code}. Stdout: ${stdout}, Stderr: ${stderr}`));
      }
    });
    
    chefProcess.stdin.write(JSON.stringify(metadata));
    chefProcess.stdin.end();
  });
}

// Create a simple callback server for testing
export function createCallbackServer(): Promise<Server> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        console.log(`Callback server received: ${body}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      });
    });
    
    server.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server running at http://localhost:${CALLBACK_SERVER_PORT}`);
      resolve(server);
    });
  });
}