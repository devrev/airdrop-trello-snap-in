import { callFunction, validateMetadataWithChefCLI } from './utils';

describe('get_external_domain_metadata Function Tests', () => {
  test('should return success status', async () => {
    const response = await callFunction('get_external_domain_metadata', {});
    expect(response.status).toBe('success');
    expect(response.message).toBeDefined();
  });

  test('should return metadata with correct structure', async () => {
    const response = await callFunction('get_external_domain_metadata');
    
    // Check that metadata exists
    expect(response.metadata).toBeDefined();
    
    // Check schema version
    expect(response.metadata.schema_version).toBeDefined();
    
    // Check that record_types exists
    expect(response.metadata.record_types).toBeDefined();
    
    // Check that users record type exists
    expect(response.metadata.record_types.users).toBeDefined();
    
    // Check that users record type has fields
    expect(response.metadata.record_types.users.fields).toBeDefined();
    
    // Check that full_name field exists with correct properties
    const fullNameField = response.metadata.record_types.users.fields.full_name;
    expect(fullNameField).toBeDefined();
    expect(fullNameField.type).toBe('text');
    expect(fullNameField.name).toBe('Full Name');
    expect(fullNameField.is_required).toBe(true);
    
    // Check that username field exists with correct properties
    const usernameField = response.metadata.record_types.users.fields.username;
    expect(usernameField).toBeDefined();
    expect(usernameField.type).toBe('text');
    expect(usernameField.name).toBe('Username');
    expect(usernameField.is_required).toBe(true);
  });

  test('should validate metadata with Chef CLI', async () => {
    // Skip test if CHEF_CLI_PATH is not set
    if (!process.env.CHEF_CLI_PATH) {
      console.error('CHEF_CLI_PATH environment variable is not set, skipping Chef CLI validation');
      return;
    }

    const response = await callFunction('get_external_domain_metadata');
    
    try {
      const isValid = await validateMetadataWithChefCLI(response.metadata);
      expect(isValid).toBe(true);
    } catch (error) {
      // This will fail the test with a descriptive error message
      throw error;
    }
  });
});