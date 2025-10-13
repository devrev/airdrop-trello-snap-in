import { spawn } from 'child_process';
import { getTestCredentials, createTestEvent, CallbackServer, callSnapInFunction } from './test-utils';

describe('get_external_domain_metadata function', () => {
  let callbackServer: CallbackServer;
  let credentials: ReturnType<typeof getTestCredentials>;

  beforeAll(async () => {
    credentials = getTestCredentials();
    callbackServer = new CallbackServer();
    await callbackServer.start();
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  test('should be invokable without errors', async () => {
    const event = createTestEvent(credentials, 'get_external_domain_metadata');
    
    let response: any;
    let error: any;

    try {
      response = await callSnapInFunction(event);
    } catch (err) {
      error = err;
    }

    expect(error).toBeUndefined();
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
  }, 30000);

  test('should return expected response structure', async () => {
    const event = createTestEvent(credentials, 'get_external_domain_metadata');
    
    const response = await callSnapInFunction(event);

    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.status).toBe('success');
    expect(response.function_result.message).toBeDefined();
    expect(response.function_result.timestamp).toBeDefined();
    expect(response.function_result.metadata).toBeDefined();
  }, 30000);

  test('should return valid external domain metadata that passes chef-cli validation', async () => {
    const event = createTestEvent(credentials, 'get_external_domain_metadata');
    
    const response = await callSnapInFunction(event);
    
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.metadata).toBeDefined();

    const metadata = response.function_result.metadata;

    // Validate with chef-cli
    const validationResult = await validateWithChefCli(metadata);
    
    if (!validationResult.success) {
      console.error('Chef CLI validation failed:');
      console.error('STDOUT:', validationResult.stdout);
      console.error('STDERR:', validationResult.stderr);
      fail(`Chef CLI validation failed: ${validationResult.error}`);
    }

    // Chef CLI should return empty output for successful validation
    expect(validationResult.stdout.trim()).toBe('');
  }, 60000);
});

interface ChefCliResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

function validateWithChefCli(metadata: any): Promise<ChefCliResult> {
  return new Promise((resolve) => {
    const credentials = getTestCredentials();
    const chefProcess = spawn(credentials.chefCliPath, ['validate-metadata'], {
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
      // Print stdout and stderr as required
      if (stdout) {
        console.log('Chef CLI STDOUT:', stdout);
      }
      if (stderr) {
        console.log('Chef CLI STDERR:', stderr);
      }

      resolve({
        success: code === 0,
        stdout,
        stderr,
        error: code !== 0 ? `Chef CLI exited with code ${code}` : undefined,
      });
    });

    chefProcess.on('error', (err) => {
      console.error('Chef CLI Error:', err.message);
      resolve({
        success: false,
        stdout: '',
        stderr: '',
        error: `Failed to execute chef-cli: ${err.message}`,
      });
    });

    // Send metadata to stdin
    chefProcess.stdin.write(JSON.stringify(metadata));
    chefProcess.stdin.end();
  });
}