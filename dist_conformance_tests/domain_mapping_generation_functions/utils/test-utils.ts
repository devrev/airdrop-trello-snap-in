import axios from 'axios';
import express from 'express';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Environment variables
export const getEnvVars = () => {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;
  const chefCliPath = process.env.CHEF_CLI_PATH;

  if (!trelloApiKey || !trelloToken || !trelloOrgId || !chefCliPath) {
    throw new Error('Required environment variables are missing. Please set TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_ORGANIZATION_ID, and CHEF_CLI_PATH');
  }

  return { trelloApiKey, trelloToken, trelloOrgId, chefCliPath };
};

// Setup callback server
export const setupCallbackServer = (port = 8002) => {
  const app = express();
  app.use(express.json());
  
  const server = app.listen(port, () => {
    console.log(`Callback server is running at http://localhost:${port}`);
  });

  // Add routes as needed
  app.post('/callback', (req, res) => {
    console.log('Received callback:', req.body);
    res.status(200).send({ success: true });
  });

  return { app, server };
};

// Create base event payload
export const createBaseEventPayload = () => {
  const { trelloApiKey, trelloToken, trelloOrgId } = getEnvVars();
  
  return {
    payload: {
      connection_data: {
        key: `key=${trelloApiKey}&token=${trelloToken}`,
        org_id: trelloOrgId,
        org_name: "Test Organization"
      },
      event_context: {
        callback_url: "http://localhost:8002/callback",
        dev_org: "dev_org_123",
        dev_org_id: "dev_org_123",
        dev_user: "dev_user_123",
        dev_user_id: "dev_user_123",
        external_sync_unit: "external_sync_unit_123",
        external_sync_unit_id: "688725dad59c015ce052eecf", // Board ID as per requirements
        external_sync_unit_name: "Test Board",
        external_system: "trello",
        external_system_type: "trello",
        import_slug: "import_123",
        mode: "INITIAL",
        request_id: "request_123",
        snap_in_slug: "snap_in_123",
        snap_in_version_id: "snap_in_version_123",
        sync_run: "sync_run_123",
        sync_run_id: "sync_run_123",
        sync_tier: "sync_tier_123",
        sync_unit: "sync_unit_123",
        sync_unit_id: "sync_unit_123",
        uuid: "uuid_123",
        worker_data_url: "http://localhost:8003/external-worker"
      },
      event_type: "TEST_EVENT_TYPE",
      event_data: {}
    },
    context: {
      dev_oid: "dev_oid_123",
      source_id: "source_id_123",
      snap_in_id: "snap_in_id_123",
      snap_in_version_id: "snap_in_version_123",
      service_account_id: "service_account_id_123",
      secrets: {
        service_account_token: "service_account_token_123"
      }
    },
    execution_metadata: {
      request_id: "request_123",
      function_name: "", // Will be set in individual tests
      event_type: "TEST_EVENT_TYPE",
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
};

// Validate initial domain mapping with Chef CLI
export const validateInitialDomainMapping = async (initialDomainMapping: any, externalDomainMetadataPath: string): Promise<boolean> => {
  const { chefCliPath } = getEnvVars();
  
  return new Promise((resolve, reject) => {
    // Create a temporary file for the initial domain mapping
    const tempFilePath = path.join(__dirname, '../temp_initial_mapping.json');
    fs.writeFileSync(tempFilePath, JSON.stringify(initialDomainMapping, null, 2));
    
    // Run Chef CLI command
    const chefProcess = spawn(chefCliPath, ['initial-mapping', 'check', '-m', externalDomainMetadataPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Send the initial domain mapping to stdin
    chefProcess.stdin.write(JSON.stringify(initialDomainMapping));
    chefProcess.stdin.end();
    
    let stdout = '';
    let stderr = '';
    
    chefProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      stdout += dataStr;
      console.log(`Chef CLI stdout: ${dataStr}`);
    });
    
    chefProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      stderr += dataStr;
      console.error(`Chef CLI stderr: ${dataStr}`);
    });
    
    chefProcess.on('close', (code) => {
      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);
      
      if (code !== 0) {
        console.error(`Chef CLI process exited with code ${code}`);
        reject(new Error(`Chef CLI validation failed with exit code ${code}`));
        return;
      }
      
      if (!stdout) {
        console.error('Chef CLI returned empty output');
        reject(new Error('Chef CLI returned empty output'));
        return;
      }
      
      try {
        const chefOutput = JSON.parse(stdout);
        
        if (!Array.isArray(chefOutput) || chefOutput.length === 0) {
          console.error('Chef CLI returned invalid output format');
          reject(new Error('Chef CLI returned invalid output format'));
          return;
        }
        
        const firstOutput = chefOutput[0];
        
        if (!('RemainingDeficiencies' in firstOutput) || !('Warnings' in firstOutput)) {
          console.error('Chef CLI output missing required fields');
          reject(new Error('Chef CLI output missing required fields'));
          return;
        }
        
        const isValid = firstOutput.RemainingDeficiencies === null && firstOutput.Warnings === null;
        resolve(isValid);
      } catch (error) {
        console.error('Failed to parse Chef CLI output:', error);
        reject(error);
      }
    });
  });
};

// Send request to the snap-in server
export const sendRequestToSnapIn = async (functionName: string, eventPayload: any) => {
  const payload = { ...eventPayload };
  payload.execution_metadata.function_name = functionName;
  
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error sending request to snap-in server for function ${functionName}:`, error);
    throw error;
  }
};