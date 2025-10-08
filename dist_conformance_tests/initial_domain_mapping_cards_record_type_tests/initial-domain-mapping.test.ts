import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import {
  getTestCredentials,
  setupCallbackServer,
  createTestEvent,
  callSnapInFunction,
  CallbackServerSetup,
} from './test-utils';

describe('Initial Domain Mapping Tests', () => {
  let callbackSetup: CallbackServerSetup;
  let credentials: ReturnType<typeof getTestCredentials>;

  beforeAll(async () => {
    credentials = getTestCredentials();
    callbackSetup = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackSetup?.server) {
      callbackSetup.server.close();
    }
  });

  test('should invoke get_initial_domain_mapping function successfully', async () => {
    const event = createTestEvent('get_initial_domain_mapping', credentials);
    
    const response = await callSnapInFunction(event);
    
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.initial_domain_mapping).toBeDefined();
    expect(typeof response.function_result.initial_domain_mapping).toBe('object');
  });

  test('should retrieve valid initial domain mapping from implementation', async () => {
    const event = createTestEvent('get_initial_domain_mapping', credentials);
    
    const response = await callSnapInFunction(event);
    
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.initial_domain_mapping).toBeDefined();
    
    const mapping = response.function_result.initial_domain_mapping;
    expect(mapping.additional_mappings).toBeDefined();
    expect(mapping.additional_mappings.record_type_mappings).toBeDefined();
    expect(mapping.additional_mappings.record_type_mappings.cards).toBeDefined();
  });

  test('should pass chef-cli validation for initial domain mapping', async () => {
    const chefCliPath = process.env.CHEF_CLI_PATH;
    if (!chefCliPath) {
      throw new Error('CHEF_CLI_PATH environment variable is required');
    }

    // Get the initial domain mapping from the implementation
    const event = createTestEvent('get_initial_domain_mapping', credentials);
    const response = await callSnapInFunction(event);
    
    expect(response.function_result.success).toBe(true);
    const initialDomainMapping = response.function_result.initial_domain_mapping;

    // Create temporary files for chef-cli validation
    const metadataFile = join(__dirname, 'temp-metadata.json');
    const mappingJson = JSON.stringify(initialDomainMapping, null, 2);

    // Get external domain metadata for chef-cli
    const metadataEvent = createTestEvent('get_external_domain_metadata', credentials);
    const metadataResponse = await callSnapInFunction(metadataEvent);
    expect(metadataResponse.function_result.success).toBe(true);
    
    writeFileSync(metadataFile, JSON.stringify(metadataResponse.function_result.external_domain_metadata, null, 2));

    try {
      const result = await new Promise<{ stdout: string; stderr: string; code: number }>((resolve, reject) => {
        const chefProcess = spawn(chefCliPath, ['initial-mapping', 'check', '-m', metadataFile], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        chefProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        chefProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        chefProcess.on('close', (code) => {
          resolve({ stdout, stderr, code: code || 0 });
        });

        chefProcess.on('error', (error) => {
          reject(new Error(`Chef CLI execution failed: ${error.message}`));
        });

        // Send the mapping JSON to stdin
        chefProcess.stdin.write(mappingJson);
        chefProcess.stdin.end();
      });

      // Always print chef-cli output
      console.log('Chef CLI stdout:', result.stdout);
      console.log('Chef CLI stderr:', result.stderr);

      expect(result.stdout.trim()).not.toBe('');
      
      let chefOutput;
      try {
        chefOutput = JSON.parse(result.stdout);
      } catch (parseError) {
        throw new Error(`Chef CLI returned invalid JSON: ${result.stdout}`);
      }

      expect(Array.isArray(chefOutput)).toBe(true);
      expect(chefOutput.length).toBeGreaterThan(0);

      const firstResult = chefOutput[0];
      expect(firstResult).toBeDefined();
      expect(firstResult.RemainingDeficiencies).toBe(null);
      expect(firstResult.Warnings).toBe(null);

      if (firstResult.RemainingDeficiencies !== null) {
        throw new Error(`Chef CLI validation failed with remaining deficiencies: ${JSON.stringify(firstResult.RemainingDeficiencies, null, 2)}`);
      }

      if (firstResult.Warnings !== null) {
        throw new Error(`Chef CLI validation failed with warnings: ${JSON.stringify(firstResult.Warnings, null, 2)}`);
      }

    } finally {
      // Clean up temporary files
      try {
        unlinkSync(metadataFile);
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary metadata file:', cleanupError);
      }
    }
  });
});