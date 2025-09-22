import { createBaseEvent, sendToSnapInServer } from './utils/test-utils';

describe('External Domain Metadata Tests', () => {
  test('External domain metadata should include required record types and fields', async () => {
    // Create event for get_external_domain_metadata function
    const event = createBaseEvent('get_external_domain_metadata');
    
    // Get external domain metadata
    const response = await sendToSnapInServer(event);
    
    // Log the response for debugging
    console.log('External domain metadata response:', JSON.stringify(response, null, 2));
    
    // Check if we have a valid response
    expect(response).toBeTruthy();
    expect(typeof response).toBe('object');

    // Get the metadata from the response
    const metadata = response.metadata || response;
    
    // Check that users record type exists
    expect(metadata.record_types.users).toBeDefined();
    
    // Check users fields
    const usersFields = metadata.record_types.users.fields;
    expect(usersFields.full_name).toBeDefined();
    expect(usersFields.full_name.type).toBe('text');
    expect(usersFields.full_name.is_required).toBe(true);
    
    expect(usersFields.username).toBeDefined();
    expect(usersFields.username.type).toBe('text');
    expect(usersFields.username.is_required).toBe(true);
    
    // Check that cards record type exists
    expect(metadata.record_types.cards).toBeDefined();
    
    // Check cards fields
    const cardsFields = metadata.record_types.cards.fields;
    expect(cardsFields.name).toBeDefined();
    expect(cardsFields.name.type).toBe('text');
    expect(cardsFields.name.is_required).toBe(true);
    
    expect(cardsFields.url).toBeDefined();
    expect(cardsFields.url.type).toBe('text');
    expect(cardsFields.url.is_required).toBe(true);
    
    expect(cardsFields.description).toBeDefined();
    expect(cardsFields.description.type).toBe('rich_text');
    expect(cardsFields.description.is_required).toBe(true);
    
    expect(cardsFields.id_members).toBeDefined();
    expect(cardsFields.id_members.type).toBe('reference');
    expect(cardsFields.id_members.is_required).toBe(true);
    expect(cardsFields.id_members.collection).toBeDefined();
    expect(cardsFields.id_members.collection.max_length).toBe(50);
    expect(cardsFields.id_members.reference).toBeDefined();
    expect(cardsFields.id_members.reference.refers_to['#record:users']).toBeDefined();
  });
});