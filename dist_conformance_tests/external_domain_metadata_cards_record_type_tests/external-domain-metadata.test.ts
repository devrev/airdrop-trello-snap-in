import { spawn } from 'child_process';
import { getTestEnvironment, createBaseEvent, CallbackServer, callSnapInFunction } from './test-utils';

describe('External Domain Metadata Conformance Tests', () => {
  let env: ReturnType<typeof getTestEnvironment>;
  let callbackServer: CallbackServer;
  let baseEvent: any;

  beforeAll(async () => {
    env = getTestEnvironment();
    callbackServer = new CallbackServer();
    await callbackServer.start();
    baseEvent = createBaseEvent(env);
  });

  afterAll(async () => {
    await callbackServer.stop();
  });

  describe('Test 1 (Trivial): Function Invocation', () => {
    it('should successfully invoke get_external_domain_metadata function', async () => {
      const result = await callSnapInFunction('get_external_domain_metadata', baseEvent);

      expect(result).toBeDefined();
      expect(result.function_result).toBeDefined();
      expect(result.function_result.success).toBe(true);
      expect(result.function_result.external_domain_metadata).toBeDefined();
      expect(typeof result.function_result.external_domain_metadata).toBe('object');
    }, 30000);
  });

  describe('Test 2 (Simple): Chef CLI Validation', () => {
    it('should validate external domain metadata with chef-cli', async () => {
      const result = await callSnapInFunction('get_external_domain_metadata', baseEvent);
      
      expect(result.function_result.success).toBe(true);
      const metadata = result.function_result.external_domain_metadata;

      const validationResult = await validateWithChefCli(metadata);
      
      if (!validationResult.success) {
        console.error('Chef CLI stdout:', validationResult.stdout);
        console.error('Chef CLI stderr:', validationResult.stderr);
        fail(`Chef CLI validation failed: ${validationResult.error}`);
      }

      expect(validationResult.success).toBe(true);
    }, 60000);
  });

  describe('Test 3 (More Complex): Cards Record Type Structure', () => {
    it('should contain cards record type with required fields while preserving existing record types', async () => {
      const result = await callSnapInFunction('get_external_domain_metadata', baseEvent);
      
      expect(result.function_result.success).toBe(true);
      const metadata = result.function_result.external_domain_metadata;

      // Validate that existing record types are preserved
      expect(metadata.record_types).toBeDefined();
      expect(metadata.record_types.users).toBeDefined();
      expect(metadata.record_types.users.name).toBe('Users');

      // Validate cards record type exists
      expect(metadata.record_types.cards).toBeDefined();
      const cardsRecord = metadata.record_types.cards;
      expect(cardsRecord.name).toBe('Cards');

      // Validate required fields
      const fields = cardsRecord.fields;
      expect(fields).toBeDefined();

      // Test name field
      expect(fields.name).toBeDefined();
      expect(fields.name.name).toBe('Name');
      expect(fields.name.type).toBe('text');
      expect(fields.name.is_required).toBe(true);

      // Test url field
      expect(fields.url).toBeDefined();
      expect(fields.url.name).toBe('URL');
      expect(fields.url.type).toBe('text');
      expect(fields.url.is_required).toBe(true);

      // Test description field
      expect(fields.description).toBeDefined();
      expect(fields.description.name).toBe('Description');
      expect(fields.description.type).toBe('rich_text');
      expect(fields.description.is_required).toBe(true);

      // Test id_members field
      expect(fields.id_members).toBeDefined();
      expect(fields.id_members.name).toBe('ID Members');
      expect(fields.id_members.type).toBe('reference');
      expect(fields.id_members.is_required).toBe(true);
      
      // Test id_members collection properties
      expect(fields.id_members.collection).toBeDefined();
      expect(fields.id_members.collection.max_length).toBe(50);
      
      // Test id_members reference properties
      expect(fields.id_members.reference).toBeDefined();
      expect(fields.id_members.reference.refers_to).toBeDefined();
      expect(fields.id_members.reference.refers_to['#record:users']).toBeDefined();
    }, 30000);
  });

  async function validateWithChefCli(metadata: any): Promise<{
    success: boolean;
    stdout: string;
    stderr: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      if (!env.CHEF_CLI_PATH) {
        resolve({
          success: false,
          stdout: '',
          stderr: '',
          error: 'CHEF_CLI_PATH environment variable not set'
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
        const success = code === 0 && stdout.trim() === '';
        resolve({
          success,
          stdout,
          stderr,
          error: success ? undefined : `Chef CLI exited with code ${code}`
        });
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          stdout,
          stderr,
          error: `Failed to spawn chef-cli: ${error.message}`
        });
      });

      // Send metadata to stdin
      child.stdin.write(JSON.stringify(metadata));
      child.stdin.end();
    });
  }
});