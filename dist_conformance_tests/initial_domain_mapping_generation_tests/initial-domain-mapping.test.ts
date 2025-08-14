import axios from 'axios';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import express, { Application } from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'http';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const CHEF_CLI_PATH = process.env.CHEF_CLI_PATH;
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

// Setup callback server
let callbackServer: ReturnType<typeof createServer>;

beforeAll(async () => {
  // Validate environment variables
  if (!CHEF_CLI_PATH) {
    throw new Error('CHEF_CLI_PATH environment variable is not set');
  }
  if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_ORGANIZATION_ID) {
    throw new Error('Trello credentials environment variables are not set');
  }

  // Start callback server
  const app: Application = express();
  app.use(bodyParser.json());
  
  callbackServer = createServer(app);
  await new Promise<void>((resolve) => {
    callbackServer.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server is running on port ${CALLBACK_SERVER_PORT}`);
      resolve();
    });
  });
});

afterAll(async () => {
  // Close callback server
  if (callbackServer) {
    await new Promise<void>((resolve) => {
      callbackServer.close(() => {
        console.log('Callback server closed');
        resolve();
      });
    });
  }
});

// Helper function to create a basic event payload
function createEventPayload(functionName: string, payload: Record<string, any> = {}) {
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
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    },
    payload: {
      connection_data: {
        org_id: TRELLO_ORGANIZATION_ID,
        org_name: 'Test Organization',
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
        key_type: 'api_key'
      },
      ...payload
    }
  };
}

describe('Initial Domain Mapping Conformance Tests', () => {
  // Test 1: Simple health check
  test('Health check should be successful', async () => {
    const response = await axios.post(
      SNAP_IN_SERVER_URL,
      createEventPayload('health_check')
    );

    expect(response.status).toBe(200);
    expect(response.data.function_result.status).toBe('success');
    expect(response.data.function_result.message).toContain('Function is operational');
  });

  // Test 2: Get initial domain mapping
  test('Should retrieve initial domain mapping successfully', async () => {
    const response = await axios.post(
      SNAP_IN_SERVER_URL,
      createEventPayload('get_initial_domain_mapping')
    );

    expect(response.status).toBe(200);
    expect(response.data.function_result.status).toBe('success');
    expect(response.data.function_result.mapping).toBeDefined();
    
    // Store the mapping for later tests
    const initialDomainMapping = response.data.function_result.mapping;
    
    // Test 3: Validate mapping structure
    expect(initialDomainMapping.additional_mappings).toBeDefined();
    expect(initialDomainMapping.additional_mappings.record_type_mappings).toBeDefined();
    expect(initialDomainMapping.additional_mappings.record_type_mappings.users).toBeDefined();
    
    const usersMapping = initialDomainMapping.additional_mappings.record_type_mappings.users;
    
    // Check default mapping
    expect(usersMapping.default_mapping).toBeDefined();
    expect(usersMapping.default_mapping.object_type).toBe('devu');
    expect(usersMapping.default_mapping.object_category).toBe('stock');
    
    // Check possible record type mappings
    expect(usersMapping.possible_record_type_mappings).toBeDefined();
    expect(usersMapping.possible_record_type_mappings.length).toBe(1);
    
    const possibleMapping = usersMapping.possible_record_type_mappings[0];
    expect(possibleMapping.forward).toBe(true);
    expect(possibleMapping.reverse).toBe(false);
    expect(possibleMapping.devrev_leaf_type).toBe('devu');
    
    // Check shard configuration
    expect(possibleMapping.shard).toBeDefined();
    expect(possibleMapping.shard.mode).toBe('create_shard');
    expect(possibleMapping.shard.devrev_leaf_type).toBeDefined();
    expect(possibleMapping.shard.devrev_leaf_type.object_type).toBe('devu');
    
    // Check stock field mappings
    const stockFieldMappings = possibleMapping.shard.stock_field_mappings;
    expect(stockFieldMappings).toBeDefined();
    
    // Check full_name mapping
    expect(stockFieldMappings.full_name).toBeDefined();
    expect(stockFieldMappings.full_name.forward).toBe(true);
    expect(stockFieldMappings.full_name.reverse).toBe(false);
    expect(stockFieldMappings.full_name.primary_external_field).toBe('full_name');
    expect(stockFieldMappings.full_name.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    // Check display_name mapping
    expect(stockFieldMappings.display_name).toBeDefined();
    expect(stockFieldMappings.display_name.forward).toBe(true);
    expect(stockFieldMappings.display_name.reverse).toBe(false);
    expect(stockFieldMappings.display_name.primary_external_field).toBe('username');
    expect(stockFieldMappings.display_name.transformation_method_for_set.transformation_method).toBe('use_directly');
  });

  // Test 4: Validate with Chef CLI
  test('Initial domain mapping should be valid according to Chef CLI', async () => {
    // First get the external domain metadata
    const metadataResponse = await axios.post(
      SNAP_IN_SERVER_URL,
      createEventPayload('get_external_domain_metadata')
    );
    
    expect(metadataResponse.status).toBe(200);
    expect(metadataResponse.data.function_result.status).toBe('success');
    expect(metadataResponse.data.function_result.metadata).toBeDefined();
    
    // Then get the initial domain mapping
    const mappingResponse = await axios.post(
      SNAP_IN_SERVER_URL,
      createEventPayload('get_initial_domain_mapping')
    );
    
    expect(mappingResponse.status).toBe(200);
    expect(mappingResponse.data.function_result.status).toBe('success');
    expect(mappingResponse.data.function_result.mapping).toBeDefined();
    
    // Save metadata to a temporary file
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = os.tmpdir();
    const metadataFilePath = path.join(tempDir, 'external_domain_metadata.json');
    
    fs.writeFileSync(
      metadataFilePath,
      JSON.stringify(metadataResponse.data.function_result.metadata, null, 2)
    );
    
    // Run Chef CLI validation
    if (!CHEF_CLI_PATH) {
      throw new Error('CHEF_CLI_PATH is not defined');
    }
    
    const initialMapping = JSON.stringify(mappingResponse.data.function_result.mapping);
    
    return new Promise<void>((resolve, reject) => {
      const chefProcess: ChildProcessWithoutNullStreams = spawn(CHEF_CLI_PATH, ['initial-mapping', 'check', '-m', metadataFilePath]);
      
      let stdout = '';
      let stderr = '';
      
      // Send the initial mapping to stdin
      chefProcess.stdin.write(initialMapping, 'utf8');
      chefProcess.stdin.end();
      
      // Collect stdout
      chefProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdout += chunk;
        // Print to console as required
        process.stdout.write(chunk);
      });
      
      // Collect stderr
      chefProcess.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        // Print to console as required
        process.stderr.write(chunk);
      });
      
      // Handle process completion
      chefProcess.on('close', (code: number | null) => {
        // Clean up temp file
        try {
          fs.unlinkSync(metadataFilePath);
        } catch (err) {
          console.error('Error deleting temporary file:', err);
        }
        
        // Check if Chef CLI is available
        if (code === 127) {
          return reject(new Error('Chef CLI is not available'));
        }
        
        // Check if we got empty output
        if (!stdout.trim()) {
          return reject(new Error('Chef CLI returned empty output'));
        }
        
        try {
          const chefOutput = JSON.parse(stdout);
          
          // Validate Chef CLI output
          if (!Array.isArray(chefOutput) || chefOutput.length === 0) {
            return reject(new Error('Chef CLI output is not a valid array'));
          }
          
          const firstResult = chefOutput[0];
          
          // Check if RemainingDeficiencies and Warnings fields exist and are null
          if (!('RemainingDeficiencies' in firstResult) || !('Warnings' in firstResult)) {
            return reject(new Error('Chef CLI output missing required fields'));
          }
          
          if (firstResult.RemainingDeficiencies !== null || firstResult.Warnings !== null) {
            return reject(new Error('Initial domain mapping has deficiencies or warnings'));
          }
          
          resolve();
        } catch (error) {
          reject(new Error(`Failed to parse Chef CLI output: ${error}`));
        }
      });
      
      // Handle process errors
      chefProcess.on('error', (error: Error) => {
        reject(new Error(`Failed to execute Chef CLI: ${error.message}`));
      });
    });
  });
});