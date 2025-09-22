import { callSnapInServer, createBaseEvent, getEnvVars, validateMetadataWithChefCli } from './utils';

describe('External Domain Metadata Tests', () => {
  test('get_external_domain_metadata returns valid metadata with required fields', async () => {
    // Create event for get_external_domain_metadata function
    const event = createBaseEvent();
    event.execution_metadata.function_name = 'get_external_domain_metadata';
    
    // Call the snap-in server
    const response = await callSnapInServer(event);
    
    // Check if the response is successful
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.metadata).toBeDefined();
    
    const metadata = response.function_result.metadata;
    
    // Validate metadata with Chef CLI
    const validationResult = await validateMetadataWithChefCli(metadata);
    expect(validationResult.success).toBe(true);
    
    // Verify record types
    expect(metadata.record_types).toBeDefined();
    
    // Verify users record type exists (preserving existing record types)
    expect(metadata.record_types.users).toBeDefined();
    
    // Verify cards record type exists with required fields
    expect(metadata.record_types.cards).toBeDefined();
    const cardsType = metadata.record_types.cards;
    
    // Verify cards fields
    expect(cardsType.fields.name).toBeDefined();
    expect(cardsType.fields.name.type).toBe('text');
    expect(cardsType.fields.name.name).toBe('Name');
    expect(cardsType.fields.name.is_required).toBe(true);
    
    expect(cardsType.fields.url).toBeDefined();
    expect(cardsType.fields.url.type).toBe('text');
    expect(cardsType.fields.url.name).toBe('URL');
    expect(cardsType.fields.url.is_required).toBe(true);
    
    expect(cardsType.fields.description).toBeDefined();
    expect(cardsType.fields.description.type).toBe('rich_text');
    expect(cardsType.fields.description.name).toBe('Description');
    expect(cardsType.fields.description.is_required).toBe(true);
    
    // Verify id_members field
    expect(cardsType.fields.id_members).toBeDefined();
    expect(cardsType.fields.id_members.type).toBe('reference');
    expect(cardsType.fields.id_members.name).toBe('ID Members');
    expect(cardsType.fields.id_members.is_required).toBe(true);
    
    // Verify id_members is an array with max_length 50
    expect(cardsType.fields.id_members.collection).toBeDefined();
    expect(cardsType.fields.id_members.collection.max_length).toBe(50);
    
    // Verify id_members refers to users record type
    expect(cardsType.fields.id_members.reference).toBeDefined();
    expect(cardsType.fields.id_members.reference.refers_to).toBeDefined();
    expect(cardsType.fields.id_members.reference.refers_to['#record:users']).toBeDefined();
  });
});