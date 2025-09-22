import { createEventPayload, sendToSnapInServer, validateMetadataWithChefCli } from './utils';

describe('get_external_domain_metadata function', () => {
  // Test 1: Basic - Function can be invoked and returns a response
  test('should return a response when invoked', async () => {
    // Create event payload for get_external_domain_metadata function
    const payload = createEventPayload();
    
    // Send request to snap-in server
    const response = await sendToSnapInServer(payload);
    
    // Verify response exists
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    expect(response.function_result).toBeDefined();
  });

  // Test 2: Intermediate - Response has expected structure
  test('should return response with expected structure', async () => {
    // Create event payload for get_external_domain_metadata function
    const payload = createEventPayload();
    
    // Send request to snap-in server
    const response = await sendToSnapInServer(payload);
    
    // Verify response structure
    const result = response.function_result;
    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
    expect(result.metadata).toBeDefined();
  });

  // Test 3: Advanced - Validate metadata with Chef CLI
  test('should return valid external domain metadata that passes Chef CLI validation', async () => {
    // Create event payload for get_external_domain_metadata function
    const payload = createEventPayload();
    
    // Send request to snap-in server
    const response = await sendToSnapInServer(payload);
    
    // Extract metadata from response
    const metadata = response.function_result.metadata;
    
    // Verify metadata structure
    expect(metadata.schema_version).toBeDefined();
    expect(metadata.record_types).toBeDefined();
    expect(metadata.record_types.users).toBeDefined();
    
    // Verify users record type has required fields
    const usersFields = metadata.record_types.users.fields;
    expect(usersFields.full_name).toBeDefined();
    expect(usersFields.full_name.type).toBe('text');
    expect(usersFields.full_name.name).toBe('Full Name');
    expect(usersFields.full_name.is_required).toBe(true);
    
    expect(usersFields.username).toBeDefined();
    expect(usersFields.username.type).toBe('text');
    expect(usersFields.username.name).toBe('Username');
    expect(usersFields.username.is_required).toBe(true);
    
    // Validate metadata with Chef CLI
    const validationResult = await validateMetadataWithChefCli(metadata);
    
    // Verify validation result
    expect(validationResult.isValid).toBe(true);
  });
});