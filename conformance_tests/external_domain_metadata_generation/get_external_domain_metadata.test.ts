import { invokeFunction, validateMetadataWithChefCLI } from './utils';

describe('get_external_domain_metadata function', () => {
  // Test 1: Basic connectivity test
  test('should be able to connect to the test server', async () => {
    try {
      // Just a simple health check to verify connectivity
      const result = await invokeFunction('health_check');
      expect(result).toBeDefined();
      expect(result.function_result).toBeDefined();
      expect(result.function_result.status).toBe('operational');
    } catch (error) {
      fail(`Failed to connect to test server: ${error}`);
    }
  });

  // Test 2: Function invocation test
  test('should be able to invoke get_external_domain_metadata function', async () => {
    const result = await invokeFunction('get_external_domain_metadata');
    
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(true);
    expect(result.function_result.message).toBe('Successfully retrieved external domain metadata');
  });

  // Test 3: Metadata structure test
  test('should return metadata with the expected structure', async () => {
    const result = await invokeFunction('get_external_domain_metadata');
    
    const metadata = result.function_result.metadata;
    expect(metadata).toBeDefined();
    expect(metadata.schema_version).toBe('v0.2.0');
    expect(metadata.record_types).toBeDefined();
    
    // Check users record type
    const usersRecordType = metadata.record_types.users;
    expect(usersRecordType).toBeDefined();
    expect(usersRecordType.name).toBe('Users');
    expect(usersRecordType.fields).toBeDefined();
    
    // Check fields
    const fields = usersRecordType.fields;
    
    // Check full_name field
    expect(fields.full_name).toBeDefined();
    expect(fields.full_name.type).toBe('text');
    expect(fields.full_name.is_required).toBe(true);
    expect(fields.full_name.name).toBe('Full Name');
    
    // Check username field
    expect(fields.username).toBeDefined();
    expect(fields.username.type).toBe('text');
    expect(fields.username.is_required).toBe(true);
    expect(fields.username.name).toBe('Username');
  });

  // Test 4: Chef CLI validation test
  test('should validate metadata with Chef CLI', async () => {
    // Skip test if Chef CLI is not available
    if (!process.env.CHEF_CLI_PATH) {
      console.warn('Skipping Chef CLI validation test: CHEF_CLI_PATH not set');
      return;
    }

    const result = await invokeFunction('get_external_domain_metadata');
    const metadata = result.function_result.metadata;
    
    const validationResult = await validateMetadataWithChefCLI(metadata);
    
    expect(validationResult.isValid).toBe(true);
    if (!validationResult.isValid) {
      console.error('Chef CLI validation failed:');
      console.error('stdout:', validationResult.stdout);
      console.error('stderr:', validationResult.stderr);
      fail('Metadata validation with Chef CLI failed');
    }
  });
});