import { callFunction } from './api-client';
import { validateWithChefCli } from './chef-cli-utils';

// Increase timeout for this test to accommodate CLI execution
jest.setTimeout(30000);

describe('Chef CLI Metadata Validation Tests', () => {
  test('metadata should be valid according to Chef CLI validation', async () => {
    // Skip test if Chef CLI path is not provided
    const chefCliPath = process.env.CHEF_CLI_PATH;
    if (!chefCliPath) {
      console.error('CHEF_CLI_PATH environment variable is not set');
      // Test should always fail if Chef CLI is not available
      fail('Chef CLI path not provided. Set CHEF_CLI_PATH environment variable.');
      return;
    }

    // Call the generate_domain_metadata function
    const response = await callFunction('generate_domain_metadata');
    
    // Check that we got a response without errors
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    expect(response.function_result).toBeDefined();
    
    // Extract metadata from the response
    const metadata = response.function_result.metadata;
    expect(metadata).toBeDefined();
    
    // Log metadata for debugging purposes
    console.log('Validating metadata with Chef CLI...');
    
    // Validate metadata using Chef CLI
    const validationResult = await validateWithChefCli(metadata);
    
    // Log validation result for debugging
    console.log('Chef CLI validation result:', validationResult);
    
    // If validation failed, log detailed information
    if (!validationResult.success) {
      console.error('Chef CLI validation failed:');
      if (validationResult.output) console.error('Output:', validationResult.output);
      if (validationResult.error) console.error('Error:', validationResult.error);
    }
    
    // Test should pass only if validation was successful
    expect(validationResult.success).toBe(true);
    
    // For successful validation, Chef CLI should return empty output
    if (validationResult.output) {
      expect(validationResult.output.trim()).toBe('');
    }
  });
});