import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import { spawn } from 'child_process';
import { Server } from 'http';

// Environment variables
export const getEnvVariables = () => {
  const requiredEnvVars = [
    'TRELLO_API_KEY',
    'TRELLO_TOKEN',
    'TRELLO_ORGANIZATION_ID',
    'CHEF_CLI_PATH'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    trelloApiKey: process.env.TRELLO_API_KEY!,
    trelloToken: process.env.TRELLO_TOKEN!,
    trelloOrgId: process.env.TRELLO_ORGANIZATION_ID!,
    chefCliPath: process.env.CHEF_CLI_PATH!
  };
};

// Create base event payload
export const createEventPayload = () => {
  const { trelloApiKey, trelloToken, trelloOrgId } = getEnvVariables();
  
  return {
    payload: {
      connection_data: {
        key: `key=${trelloApiKey}&token=${trelloToken}`,
        org_id: trelloOrgId,
        org_name: 'Test Organization'
      },
      event_context: {
        request_id: 'test-request-id',
        external_sync_unit_id: '688725dad59c015ce052eecf'
      },
      event_type: 'TEST_EVENT'
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
      request_id: 'test-request-id',
      function_name: 'get_external_domain_metadata',
      event_type: 'test_event',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
};

// Setup callback server
export const setupCallbackServer = (port = 8002): Promise<{ server: Server, getLastCallback: () => any }> => {
  return new Promise((resolve) => {
    let lastCallback: any = null;
    const app = express();
    app.use(bodyParser.json());
    
    app.post('*', (req, res) => {
      lastCallback = req.body;
      res.status(200).send({ status: 'ok' });
    });
    
    const server = app.listen(port, () => {
      resolve({
        server,
        getLastCallback: () => lastCallback
      });
    });
  });
};

// Send request to snap-in server
export const sendToSnapInServer = async (payload: any) => {
  try {
    const response = await axios.post('http://localhost:8000/handle/sync', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Error sending request to snap-in server:', error);
    throw error;
  }
};

// Validate external domain metadata using Chef CLI
export const validateMetadataWithChefCli = async (metadata: any): Promise<{ isValid: boolean, output: string }> => {
  const { chefCliPath } = getEnvVariables();
  
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    
    const chefCli = spawn(chefCliPath, ['validate-metadata']);
    
    chefCli.stdin.write(JSON.stringify(metadata));
    chefCli.stdin.end();
    
    chefCli.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`Chef CLI stdout: ${output}`);
    });
    
    chefCli.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error(`Chef CLI stderr: ${output}`);
    });
    
    chefCli.on('close', (code) => {
      const output = stdout + stderr;
      resolve({
        isValid: code === 0 && output.trim() === '',
        output
      });
    });
  });
};