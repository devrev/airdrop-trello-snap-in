import { spawn } from 'child_process';
import { join } from 'path';
import { promisify } from 'util';
import { getTestEnvironment, createBaseEvent, CallbackServer, callSnapInFunction } from './test-utils';

const execFile = promisify(require('child_process').execFile);

describe('get_initial_domain_mapping function', () => {
  let callbackServer: CallbackServer;
  let env: ReturnType<typeof getTestEnvironment>;
  let baseEvent: any;

  beforeAll(async () => {
    callbackServer = new CallbackServer();
    await callbackServer.start();
    env = getTestEnvironment();
    baseEvent = createBaseEvent(env);
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  test('should be invokable and return success response', async () => {
    const response = await callSnapInFunction('get_initial_domain_mapping', baseEvent);

    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toContain('successfully');
    expect(response.error).toBeUndefined();
  });

  test('should return initial domain mapping with users record type mapping', async () => {
    const response = await callSnapInFunction('get_initial_domain_mapping', baseEvent);

    expect(response.function_result.initial_domain_mapping).toBeDefined();
    expect(response.function_result.initial_domain_mapping.additional_mappings).toBeDefined();
    expect(response.function_result.initial_domain_mapping.additional_mappings.record_type_mappings).toBeDefined();
    expect(response.function_result.initial_domain_mapping.additional_mappings.record_type_mappings.users).toBeDefined();

    const usersMapping = response.function_result.initial_domain_mapping.additional_mappings.record_type_mappings.users;
    expect(usersMapping.default_mapping).toBeDefined();
    expect(usersMapping.default_mapping.object_type).toBe('devu');
    expect(usersMapping.possible_record_type_mappings).toBeDefined();
    expect(Array.isArray(usersMapping.possible_record_type_mappings)).toBe(true);
    expect(usersMapping.possible_record_type_mappings.length).toBe(1);
  });

  test('should pass chef-cli validation without deficiencies or warnings', async () => {
    const response = await callSnapInFunction('get_initial_domain_mapping', baseEvent);
    const initialDomainMapping = response.function_result.initial_domain_mapping;

    // Write external domain metadata to temporary file for chef-cli
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const tempDir = os.tmpdir();
    const metadataFile = path.join(tempDir, 'external-domain-metadata.json');
    
    // Read the external domain metadata from the local test file
    const metadataSourceFile = join(__dirname, 'external-domain-metadata.json');
    const externalDomainMetadata = JSON.parse(fs.readFileSync(metadataSourceFile, 'utf8'));
    fs.writeFileSync(metadataFile, JSON.stringify(externalDomainMetadata, null, 2));

    try {
      // Run chef-cli validation
      const chefProcess = spawn(env.CHEF_CLI_PATH, ['initial-mapping', 'check', '-m', metadataFile], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Send initial domain mapping to stdin
      chefProcess.stdin.write(JSON.stringify(initialDomainMapping));
      chefProcess.stdin.end();

      let stdout = '';
      let stderr = '';

      chefProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      chefProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const exitCode = await new Promise<number>((resolve) => {
        chefProcess.on('close', resolve);
      });

      // Print chef-cli output for debugging
      console.log('Chef CLI stdout:', stdout);
      console.log('Chef CLI stderr:', stderr);

      expect(exitCode).toBe(0);
      expect(stdout.trim()).not.toBe('');

      let chefOutput;
      try {
        chefOutput = JSON.parse(stdout);
      } catch (parseError) {
        throw new Error(`Failed to parse chef-cli output as JSON: ${parseError}. Output: ${stdout}`);
      }

      expect(Array.isArray(chefOutput)).toBe(true);
      expect(chefOutput.length).toBeGreaterThan(0);

      const firstResult = chefOutput[0];
      expect(firstResult).toBeDefined();
      expect(firstResult.RemainingDeficiencies).toBe(null);
      expect(firstResult.Warnings).toBe(null);
      expect(firstResult.Outcome).toBeDefined();

    } finally {
      // Clean up temporary file
      try {
        fs.unlinkSync(metadataFile);
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary metadata file:', cleanupError);
      }
    }
  });
});