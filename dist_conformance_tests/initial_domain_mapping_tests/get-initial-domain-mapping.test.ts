import { spawn } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { getTestEnvironment, createBaseTestEvent, CallbackServer, callSnapInFunction } from './test-utils';

const execAsync = promisify(spawn);

describe('get_initial_domain_mapping function', () => {
  let callbackServer: CallbackServer;
  let env: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    env = getTestEnvironment();
    callbackServer = new CallbackServer();
    await callbackServer.start();
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  test('should successfully invoke the function', async () => {
    const event = createBaseTestEvent('get_initial_domain_mapping', env);
    
    let response;
    try {
      response = await callSnapInFunction('get_initial_domain_mapping', event);
    } catch (error: any) {
      throw new Error(`Failed to invoke get_initial_domain_mapping function: ${error.message}. Response: ${JSON.stringify(error.response?.data, null, 2)}`);
    }

    expect(response).toBeDefined();
    expect(typeof response).toBe('object');
  }, 30000);

  test('should return proper response structure', async () => {
    const event = createBaseTestEvent('get_initial_domain_mapping', env);
    
    let response;
    try {
      response = await callSnapInFunction('get_initial_domain_mapping', event);
    } catch (error: any) {
      throw new Error(`Failed to get response from get_initial_domain_mapping function: ${error.message}. Response: ${JSON.stringify(error.response?.data, null, 2)}`);
    }

    expect(response.function_result).toBeDefined();
    expect(response.function_result.status).toBe('success');
    expect(response.function_result.message).toBeDefined();
    expect(response.function_result.timestamp).toBeDefined();
    expect(response.function_result.mapping).toBeDefined();

    const mapping = response.function_result.mapping;
    expect(typeof mapping).toBe('object');
    expect(mapping.additional_mappings).toBeDefined();
    expect(mapping.additional_mappings.record_type_mappings).toBeDefined();
    expect(mapping.additional_mappings.record_type_mappings.users).toBeDefined();
  }, 30000);

  test('should pass Chef CLI validation', async () => {
    const event = createBaseTestEvent('get_initial_domain_mapping', env);
    
    let response;
    try {
      response = await callSnapInFunction('get_initial_domain_mapping', event);
    } catch (error: any) {
      throw new Error(`Failed to get mapping from get_initial_domain_mapping function: ${error.message}. Response: ${JSON.stringify(error.response?.data, null, 2)}`);
    }

    expect(response.function_result?.mapping).toBeDefined();
    const mapping = response.function_result.mapping;

    // Validate with Chef CLI
    const chefCliPath = env.CHEF_CLI_PATH;

    // Use absolute path to the metadata file in the build folder (sibling to conformance tests)
    const metadataFilePath = path.resolve(__dirname, '..', '..', 'build', 'src', 'core', 'external-domain-metadata.json');

    return new Promise<void>((resolve, reject) => {
      const chefProcess = spawn(chefCliPath, ['initial-mapping', 'check', '-m', metadataFilePath], {
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

      chefProcess.on('close', (code) => {
        console.log('Chef CLI stdout:', stdout);
        console.log('Chef CLI stderr:', stderr);

        if (code !== 0) {
          reject(new Error(`Chef CLI failed with exit code ${code}. Stderr: ${stderr}`));
          return;
        }

        if (!stdout.trim()) {
          reject(new Error('Chef CLI returned empty output'));
          return;
        }

        let chefOutput;
        try {
          chefOutput = JSON.parse(stdout);
        } catch (parseError) {
          reject(new Error(`Failed to parse Chef CLI output as JSON: ${parseError}. Output: ${stdout}`));
          return;
        }

        if (!Array.isArray(chefOutput) || chefOutput.length === 0) {
          reject(new Error(`Chef CLI output is not a non-empty array: ${JSON.stringify(chefOutput)}`));
          return;
        }

        const firstResult = chefOutput[0];
        if (!firstResult.hasOwnProperty('RemainingDeficiencies') || !firstResult.hasOwnProperty('Warnings')) {
          reject(new Error(`Chef CLI output missing required fields. Expected 'RemainingDeficiencies' and 'Warnings' fields. Got: ${JSON.stringify(firstResult)}`));
          return;
        }

        if (firstResult.RemainingDeficiencies !== null) {
          reject(new Error(`Chef CLI validation failed - remaining deficiencies found: ${JSON.stringify(firstResult.RemainingDeficiencies)}`));
          return;
        }

        if (firstResult.Warnings !== null) {
          reject(new Error(`Chef CLI validation failed - warnings found: ${JSON.stringify(firstResult.Warnings)}`));
          return;
        }

        resolve();
      });

      chefProcess.on('error', (error) => {
        reject(new Error(`Failed to execute Chef CLI: ${error.message}. Make sure CHEF_CLI_PATH is correct: ${chefCliPath}`));
      });

      // Send the mapping to Chef CLI via stdin
      chefProcess.stdin.write(JSON.stringify(mapping));
      chefProcess.stdin.end();
    });
  }, 60000);
});