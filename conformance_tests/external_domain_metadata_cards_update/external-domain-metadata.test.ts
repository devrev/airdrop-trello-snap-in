import { callSnapInFunction } from './utils/http-client';
import { validateMetadataWithChefCLI } from './utils/metadata-validator';

describe('External Domain Metadata Tests', () => {
  // Test 1: Basic - Verify function can be called and returns success
  test('get_external_domain_metadata function returns success response', async () => {
    const response = await callSnapInFunction('get_external_domain_metadata');
    
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toContain('Successfully retrieved external domain metadata');
    expect(response.function_result.metadata).toBeDefined();
  });

  // Test 2: Intermediate - Verify metadata contains required record types
  test('external domain metadata contains required record types', async () => {
    const response = await callSnapInFunction('get_external_domain_metadata');
    
    expect(response.function_result.metadata).toBeDefined();
    expect(response.function_result.metadata.record_types).toBeDefined();
    
    // Check for users record type
    expect(response.function_result.metadata.record_types.users).toBeDefined();
    expect(response.function_result.metadata.record_types.users.name).toBe('Users');
    
    // Check for cards record type
    expect(response.function_result.metadata.record_types.cards).toBeDefined();
    expect(response.function_result.metadata.record_types.cards.name).toBe('Cards');
  });

  // Test 3: Advanced - Validate metadata with Chef CLI
  test('external domain metadata is valid according to Chef CLI', async () => {
    const response = await callSnapInFunction('get_external_domain_metadata');
    
    // This will throw an error if validation fails
    await validateMetadataWithChefCLI(response.function_result.metadata);
  });

  // Test 4: Comprehensive - Verify cards record type has all required fields with correct properties
  test('cards record type has all required fields with correct properties', async () => {
    const response = await callSnapInFunction('get_external_domain_metadata');
    
    const cardsType = response.function_result.metadata.record_types.cards;
    expect(cardsType).toBeDefined();
    
    // Check name field
    expect(cardsType.fields.name).toBeDefined();
    expect(cardsType.fields.name.type).toBe('text');
    expect(cardsType.fields.name.is_required).toBe(true);
    expect(cardsType.fields.name.name).toBe('Name');
    
    // Check url field
    expect(cardsType.fields.url).toBeDefined();
    expect(cardsType.fields.url.type).toBe('text');
    expect(cardsType.fields.url.is_required).toBe(true);
    expect(cardsType.fields.url.name).toBe('URL');
    
    // Check description field
    expect(cardsType.fields.description).toBeDefined();
    expect(cardsType.fields.description.type).toBe('rich_text');
    expect(cardsType.fields.description.is_required).toBe(true);
    expect(cardsType.fields.description.name).toBe('Description');
    
    // Check id_members field
    expect(cardsType.fields.id_members).toBeDefined();
    expect(cardsType.fields.id_members.type).toBe('reference');
    expect(cardsType.fields.id_members.is_required).toBe(true);
    expect(cardsType.fields.id_members.name).toBe('ID Members');
    
    // Check id_members collection property
    expect(cardsType.fields.id_members.collection).toBeDefined();
    expect(cardsType.fields.id_members.collection.max_length).toBe(50);
    
    // Check id_members reference property
    expect(cardsType.fields.id_members.reference).toBeDefined();
    expect(cardsType.fields.id_members.reference.refers_to).toBeDefined();
    expect(cardsType.fields.id_members.reference.refers_to['#record:users']).toBeDefined();
  });
});