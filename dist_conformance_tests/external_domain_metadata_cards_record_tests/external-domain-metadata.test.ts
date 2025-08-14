import { callTestServer, validateMetadataWithChefCLI } from './utils';

// Helper function to retry tests that might be flaky due to network issues
const retryTest = async (testFn: () => Promise<void>, maxRetries = 3, delay = 1000) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await testFn();
      return; // Test passed, exit
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError; // All attempts failed
};

// Run tests sequentially to avoid interference
describe('External Domain Metadata Tests', () => {
  let originalChefCliPath: string | undefined;

  // Check if Chef CLI is available before running tests
  beforeAll(() => {
    if (!process.env.CHEF_CLI_PATH) {
      throw new Error('CHEF_CLI_PATH environment variable is not set. Chef CLI is required for these tests.');
    }
    originalChefCliPath = process.env.CHEF_CLI_PATH;
  });

  // Restore original environment after all tests
  afterAll(() => {
    if (originalChefCliPath) {
      process.env.CHEF_CLI_PATH = originalChefCliPath;
    }
  });

  test('External domain metadata contains required record types and fields', async () => {
    await retryTest(async () => {
      // Get the external domain metadata
      const response = await callTestServer('get_external_domain_metadata');

      expect(response).toBeTruthy();
      expect(response.status).toBe('success');
      expect(response.metadata).toBeDefined();

      const metadata = response.metadata;

      // Check if users record type exists
      expect(metadata.record_types).toHaveProperty('users');

      // Check if cards record type exists with required fields
      expect(metadata.record_types).toHaveProperty('cards');
      const cardsType = metadata.record_types.cards;
      
      // Check required fields
      expect(cardsType.fields).toHaveProperty('name');
      expect(cardsType.fields.name.type).toBe('text');
      expect(cardsType.fields.name.name).toBe('Name');
      expect(cardsType.fields.name.is_required).toBe(true);

      expect(cardsType.fields).toHaveProperty('url');
      expect(cardsType.fields.url.type).toBe('text');
      expect(cardsType.fields.url.name).toBe('URL');
      expect(cardsType.fields.url.is_required).toBe(true);

      expect(cardsType.fields).toHaveProperty('description');
      expect(cardsType.fields.description.type).toBe('rich_text');
      expect(cardsType.fields.description.name).toBe('Description');
      expect(cardsType.fields.description.is_required).toBe(true);

      expect(cardsType.fields).toHaveProperty('id_members');
      expect(cardsType.fields.id_members.type).toBe('reference');
      expect(cardsType.fields.id_members.name).toBe('ID Members');
      expect(cardsType.fields.id_members.is_required).toBe(true);
      expect(cardsType.fields.id_members.collection).toHaveProperty('max_length', 50);
      expect(cardsType.fields.id_members.reference.refers_to).toHaveProperty('#record:users');
    });
  }, 15000); // 15 second timeout

  test('External domain metadata is valid according to Chef CLI', async () => {
    await retryTest(async () => {
      // Get the external domain metadata
      const response = await callTestServer('get_external_domain_metadata');
      expect(response).toBeDefined();
      expect(response.status).toBe('success'); 
      expect(response.metadata).toBeDefined();

      // Validate with Chef CLI
      await expect(validateMetadataWithChefCLI(response.metadata)).resolves.toBe(true);
    });
  }, 15000); // 15 second timeout

  // This test is problematic and can cause timeouts - let's fix it
  test('Test fails when Chef CLI is not available', async () => {
    // Temporarily save the original CHEF_CLI_PATH
    const originalPath = process.env.CHEF_CLI_PATH;
    
    // Set CHEF_CLI_PATH to an invalid path
    const invalidPath = '/non/existent/path/chef-cli-' + Date.now().toString();
    process.env.CHEF_CLI_PATH = invalidPath;
    console.log(`Set temporary invalid Chef CLI path: ${process.env.CHEF_CLI_PATH}`);
    
    // Get the external domain metadata
    const response = await callTestServer('get_external_domain_metadata');
    
    // This should throw an error because Chef CLI is not available
    await expect(async () => {
      try {
        await validateMetadataWithChefCLI(response.metadata);
      } catch (error) {
        throw error;
      }
    }).rejects.toThrow();
    
      // Restore the original CHEF_CLI_PATH
      process.env.CHEF_CLI_PATH = originalPath;
  });
});