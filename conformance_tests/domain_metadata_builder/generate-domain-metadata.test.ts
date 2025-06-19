import { callFunction } from './api-client';
import { validateMetadataSchema } from './metadata-schema-validator';

// Increase timeout for all tests in this file
jest.setTimeout(30000);

// Add a small delay between tests to avoid overwhelming the server
beforeEach(() => new Promise(resolve => setTimeout(resolve, 500)));

describe('Generate Domain Metadata Function Tests', () => {
  // Test 1: Basic test - Function existence
  test('generate_domain_metadata function exists and can be invoked', async () => {
    const response = await callFunction('generate_domain_metadata');
    
    // Check that we got a response without errors
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result).toBeDefined();
  });

  // Test 2: Intermediate test - Response structure
  test('generate_domain_metadata returns properly structured response', async () => {
    const response = await callFunction('generate_domain_metadata');
    
    // Check response structure
    const result = response.function_result;
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('metadata');
    expect(result.success).toBe(true);
    expect(typeof result.message).toBe('string');
    expect(typeof result.metadata).toBe('object');
  });

  // Test 3: Complex test - Schema validation
  test('generated metadata conforms to external domain metadata schema', async () => {
    const response = await callFunction('generate_domain_metadata');
    const metadata = response.function_result.metadata;
    
    // Validate against schema
    const validationResult = validateMetadataSchema(metadata);
    console.log('Validation result:', validationResult);
    
    // If validation fails, log the errors for debugging
    if (!validationResult.valid && validationResult.errors) {
      console.error('Schema validation errors:', JSON.stringify(validationResult.errors, null, 2));
    }
    
    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toBeUndefined();
    
    // Check schema version
    expect(metadata.schema_version).toBe('v0.2.0');
    
    // Check that required record types exist
    expect(metadata.record_types).toBeDefined();
    expect(metadata.record_types.cards).toBeDefined();
    expect(metadata.record_types.users).toBeDefined();
  });

  // Test 4: Advanced test - Record type field validation
  test('cards record type has all required fields with correct types', async () => {
    const response = await callFunction('generate_domain_metadata');
    const metadata = response.function_result.metadata;
    const cardsType = metadata.record_types.cards;
    
    // Check cards record type structure
    expect(cardsType).toHaveProperty('name');
    expect(cardsType).toHaveProperty('description');
    expect(cardsType).toHaveProperty('fields');
    
    // Check required fields exist with correct types
    const fields = cardsType.fields;
    
    // ID field
    expect(fields.id).toBeDefined();
    expect(fields.id.type).toBe('text');
    expect(fields.id.is_required).toBe(true);
    expect(fields.id.is_identifier).toBe(true);
    
    // Name field
    expect(fields.name).toBeDefined();
    expect(fields.name.type).toBe('text');
    expect(fields.name.is_required).toBe(true);
    
    // Description field
    expect(fields.description).toBeDefined();
    expect(fields.description.type).toBe('rich_text');
    
    // Board reference field
    expect(fields.board_id).toBeDefined();
    expect(fields.board_id.type).toBe('reference');
    expect(fields.board_id.reference).toBeDefined();
    expect(fields.board_id.reference.refers_to).toHaveProperty('#record:boards');
  });

  // Test 5: Advanced test - Users record type validation
  test('users record type has all required fields with correct types', async () => {
    const response = await callFunction('generate_domain_metadata');
    const metadata = response.function_result.metadata;
    const usersType = metadata.record_types.users;
    
    // Check users record type structure
    expect(usersType).toHaveProperty('name');
    expect(usersType).toHaveProperty('description');
    expect(usersType).toHaveProperty('fields');
    
    // Check required fields exist with correct types
    const fields = usersType.fields;
    
    // ID field
    expect(fields.id).toBeDefined();
    expect(fields.id.type).toBe('text');
    expect(fields.id.is_required).toBe(true);
    expect(fields.id.is_identifier).toBe(true);
    
    // Username field
    expect(fields.username).toBeDefined();
    expect(fields.username.type).toBe('text');
    expect(fields.username.is_required).toBe(true);
    
    // Email field
    expect(fields.email).toBeDefined();
    expect(fields.email.type).toBe('text');
  });
});