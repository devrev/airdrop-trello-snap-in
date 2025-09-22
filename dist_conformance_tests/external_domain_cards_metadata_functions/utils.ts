import axios from 'axios';
import { spawn } from 'child_process';
import express from 'express';
import { Server } from 'http';

// Environment variables
export const getEnvVars = () => {
  const trelloApiKey = process.env.TRELLO_API_KEY;
  const trelloToken = process.env.TRELLO_TOKEN;
  const trelloOrgId = process.env.TRELLO_ORGANIZATION_ID;
  const chefCliPath = process.env.CHEF_CLI_PATH;

  if (!trelloApiKey) throw new Error('TRELLO_API_KEY environment variable is not set');
  if (!trelloToken) throw new Error('TRELLO_TOKEN environment variable is not set');
  if (!trelloOrgId) throw new Error('TRELLO_ORGANIZATION_ID environment variable is not set');
  if (!chefCliPath) throw new Error('CHEF_CLI_PATH environment variable is not set');

  return { trelloApiKey, trelloToken, trelloOrgId, chefCliPath };
};

// Create a base event with common properties
export const createBaseEvent = () => {
  const { trelloApiKey, trelloToken, trelloOrgId } = getEnvVars();
  
  return {
    payload: {
      connection_data: {
        key: `key=${trelloApiKey}&token=${trelloToken}`,
        org_id: trelloOrgId,
        org_name: "Test Organization",
        key_type: "oauth"
      },
      event_context: {
        request_id: "test-request-id",
        external_sync_unit_id: "688725dad59c015ce052eecf"
      },
      event_type: "TEST_EVENT"
    },
    context: {
      dev_oid: "test-dev-oid",
      source_id: "test-source-id",
      snap_in_id: "test-snap-in-id",
      snap_in_version_id: "test-snap-in-version-id",
      service_account_id: "test-service-account-id",
      secrets: {
        service_account_token: "test-service-account-token"
      }
    },
    execution_metadata: {
      request_id: "test-request-id",
      function_name: "get_external_domain_metadata",
      event_type: "test-event-type",
      devrev_endpoint: "http://localhost:8003"
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
};

// Setup callback server
export const setupCallbackServer = (port = 8002) => {
  const app = express();
  app.use(express.json());
  
  const callbacks: any[] = [];
  
  app.post('*', (req, res) => {
    callbacks.push(req.body);
    res.status(200).send({ success: true });
  });
  
  const server = app.listen(port);
  
  return {
    server,
    getCallbacks: () => [...callbacks],
    clearCallbacks: () => callbacks.splice(0, callbacks.length)
  };
};

// Send request to snap-in server
export const callSnapInServer = async (event: any) => {
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', event, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error calling snap-in server:', error);
    throw error;
  }
};

// Validate metadata with Chef CLI
export const validateMetadataWithChefCli = (metadata: any): Promise<{ success: boolean, output: string }> => {
  return new Promise((resolve) => {
    const { chefCliPath } = getEnvVars();
    
    const chefCli = spawn(chefCliPath, ['validate-metadata']);
    let stdout = '';
    let stderr = '';
    
    chefCli.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(output);
    });
    
    chefCli.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(output);
    });
    
    chefCli.on('close', (code) => {
      const success = code === 0;
      const output = stdout + stderr;
      resolve({ success, output });
    });
    
    chefCli.stdin.write(JSON.stringify(metadata));
    chefCli.stdin.end();
  });
};