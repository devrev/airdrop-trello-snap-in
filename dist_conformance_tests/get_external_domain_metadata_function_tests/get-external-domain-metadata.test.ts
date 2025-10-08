import { spawn } from 'child_process';
import { getTestEnvironment, createTestEvent, setupCallbackServer, callSnapInFunction, CallbackServer, TestEnvironment } from './test-utils';

describe('get_external_domain_metadata function', () => {
  let env: TestEnvironment;
  let callbackServer: CallbackServer;
  let testEvent: any;

  beforeAll(async () => {
    env = getTestEnvironment();
    callbackServer = await setupCallbackServer();
    testEvent = createTestEvent(env);
  });

  afterAll(async () => {
    if (callbackServer) {
      await callbackServer.close();
    }
  });

  test('should be invokable and return a response', async () => {
    const response = await callSnapInFunction('get_external_domain_metadata', testEvent);
    
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.error).toBeUndefined();
  }, 30000);

  test('should return external domain metadata with correct structure', async () => {
    const response = await callSnapInFunction('get_external_domain_metadata', testEvent);
    
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.external_domain_metadata).toBeDefined();
    expect(typeof response.function_result.external_domain_metadata).toBe('object');
    expect(response.function_result.message).toContain('successfully');
  }, 30000);

  test('should return valid external domain metadata according to Chef CLI', async () => {
    const response = await callSnapInFunction('get_external_domain_metadata', testEvent);
    
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    
    const metadata = response.function_result.external_domain_metadata;
    expect(metadata).toBeDefined();

    // Validate using Chef CLI
    const validationResult = await validateWithChefCli(metadata);
    
    if (!validationResult.success) {
      console.error('Chef CLI validation failed:');
      console.error('STDOUT:', validationResult.stdout);
      console.error('STDERR:', validationResult.stderr);
      console.error('Exit code:', validationResult.exitCode);
    }
    
    expect(validationResult.success).toBe(true);
    expect(validationResult.stdout.trim()).toBe('');
  }, 60000);

  async function validateWithChefCli(metadata: any): Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number | null;
  }> {
    return new Promise((resolve) => {
      if (!env.CHEF_CLI_PATH) {
        resolve({
          success: false,
          stdout: '',
          stderr: 'CHEF_CLI_PATH environment variable not set',
          exitCode: -1
        });
        return;
      }

      const child = spawn(env.CHEF_CLI_PATH, ['validate-metadata'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log('Chef CLI stdout:', output);
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error('Chef CLI stderr:', output);
      });

      child.on('close', (code) => {
        console.log('Chef CLI exit code:', code);
        resolve({
          success: code === 0 && stdout.trim() === '',
          stdout,
          stderr,
          exitCode: code
        });
      });

      child.on('error', (error) => {
        console.error('Chef CLI spawn error:', error);
        resolve({
          success: false,
          stdout,
          stderr: stderr + '\nSpawn error: ' + error.message,
          exitCode: -1
        });
      });

      // Send metadata to stdin
      child.stdin.write(JSON.stringify(metadata));
      child.stdin.end();
    });
  }
});