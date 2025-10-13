import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getTestEnvironment, createCallbackServer, sendEventToSnapIn, CallbackServer } from './test-utils/test-setup';
import getInitialDomainMappingEvent from './test-events/get-initial-domain-mapping-event.json';

describe('Initial Domain Mapping Validation', () => {
  let callbackServer: CallbackServer;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await createCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await callbackServer.close();
    }
  });

  test('should validate initial domain mapping for cards record type using Chef CLI', async () => {
    // Prepare the event with actual credentials
    const event = JSON.parse(JSON.stringify(getInitialDomainMappingEvent));
    event.payload.connection_data.key = event.payload.connection_data.key
      .replace('TRELLO_API_KEY', testEnv.trelloApiKey)
      .replace('TRELLO_TOKEN', testEnv.trelloToken);
    event.payload.connection_data.org_id = event.payload.connection_data.org_id
      .replace('TRELLO_ORGANIZATION_ID', testEnv.trelloOrganizationId);

    // Get the initial domain mapping from the snap-in
    const response = await sendEventToSnapIn(event);
    
    // Debug: Log the actual response structure
    console.log('Raw response from snap-in:', JSON.stringify(response, null, 2));
    console.log('Response type:', typeof response);
    
    expect(response).toBeDefined();

    // The snap-in server may wrap the function response differently
    // Let's extract the mapping from the actual response structure
    let initialDomainMapping;
    
    // Handle different possible response structures
    if (response && typeof response === 'object') {
      if (response.mapping) {
        // Response has mapping property
        initialDomainMapping = response.mapping;
      } else if (response.function_result && response.function_result.mapping) {
        // Response wrapped in function_result
        initialDomainMapping = response.function_result.mapping;
      } else if (response.status === 'success' && response.mapping) {
        // Direct function response structure
        initialDomainMapping = response.mapping;
      } else if (response.additional_mappings) {
        // The response itself is the mapping
        initialDomainMapping = response;
      } else {
        // Try to find mapping in nested structures
        const keys = Object.keys(response);
        for (const key of keys) {
          if (response[key] && typeof response[key] === 'object' && response[key].additional_mappings) {
            initialDomainMapping = response[key];
            break;
          }
        }
      }
    }
    
    console.log('Extracted mapping:', initialDomainMapping ? 'Found' : 'Not found');
    if (initialDomainMapping) {
      console.log('Mapping keys:', Object.keys(initialDomainMapping));
    }
    
    if (!initialDomainMapping) {
      throw new Error(`Unable to extract initial domain mapping from response. Response structure: ${JSON.stringify(response, null, 2)}`);
    }

    // Write external domain metadata to temp file for Chef CLI
    const externalDomainMetadata = {
      "schema_version": "v0.2.0",
      "record_types": {
        "users": {
          "name": "Users",
          "fields": {
            "full_name": { "name": "Full Name", "type": "text", "is_required": true },
            "username": { "name": "Username", "type": "text", "is_required": true }
          }
        },
        "cards": {
          "name": "Cards",
          "fields": {
            "name": { "name": "Name", "type": "text", "is_required": true },
            "url": { "name": "URL", "type": "text", "is_required": true },
            "description": { "name": "Description", "type": "rich_text", "is_required": true },
            "id_members": {
              "name": "ID Members", "type": "reference", "is_required": true,
              "collection": { "max_length": 50 },
              "reference": { "refers_to": { "#record:users": {} } }
            },
            "created_by": {
              "name": "Created By", "type": "reference", "is_required": true,
              "reference": { "refers_to": { "#record:users": {} } }
            }
          }
        }
      }
    };

    const tempMetadataFile = path.join(__dirname, 'temp-metadata.json');
    fs.writeFileSync(tempMetadataFile, JSON.stringify(externalDomainMetadata, null, 2));

    try {
      // Validate with Chef CLI
      const chefCliResult = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
        const chefProcess = spawn(testEnv.chefCliPath, ['initial-mapping', 'check', '-m', tempMetadataFile], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        chefProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        chefProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        chefProcess.stdin.write(JSON.stringify(initialDomainMapping));
        chefProcess.stdin.end();

        chefProcess.on('close', (code) => {
          resolve({ stdout, stderr, exitCode: code || 0 });
        });

        chefProcess.on('error', (error) => {
          reject(new Error(`Chef CLI execution failed: ${error.message}`));
        });
      });

      // Print Chef CLI output for debugging
      console.log('Chef CLI stdout:', chefCliResult.stdout);
      console.log('Chef CLI stderr:', chefCliResult.stderr);

      // Validate Chef CLI output
      expect(chefCliResult.stdout).toBeTruthy();
      expect(chefCliResult.stdout.trim()).not.toBe('');

      let chefOutput;
      try {
        chefOutput = JSON.parse(chefCliResult.stdout);
      } catch (parseError) {
        throw new Error(`Chef CLI output is not valid JSON: ${chefCliResult.stdout}`);
      }

      expect(Array.isArray(chefOutput)).toBe(true);
      expect(chefOutput.length).toBeGreaterThan(0);

      const firstResult = chefOutput[0];
      expect(firstResult).toBeDefined();
      expect(firstResult).toHaveProperty('RemainingDeficiencies');
      expect(firstResult).toHaveProperty('Warnings');
      
      if (firstResult.RemainingDeficiencies !== null) {
        throw new Error(`Chef CLI validation failed with remaining deficiencies: ${JSON.stringify(firstResult.RemainingDeficiencies, null, 2)}`);
      }
      
      if (firstResult.Warnings !== null) {
        throw new Error(`Chef CLI validation failed with warnings: ${JSON.stringify(firstResult.Warnings, null, 2)}`);
      }

      expect(firstResult.RemainingDeficiencies).toBeNull();
      expect(firstResult.Warnings).toBeNull();

    } finally {
      // Clean up temp file
      if (fs.existsSync(tempMetadataFile)) {
        fs.unlinkSync(tempMetadataFile);
      }
    }
  });
});