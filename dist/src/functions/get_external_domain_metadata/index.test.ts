import { run } from './index';
import { FunctionInput } from '../../core/types';
import externalDomainMetadata from './external_domain_metadata.json';

describe('get_external_domain_metadata function', () => {
  const mockEvent: FunctionInput = {
    payload: {},
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token'
      }
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: 'get_external_domain_metadata',
      event_type: 'test-event-type',
      devrev_endpoint: 'https://api.devrev.ai'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  it('should return the External Domain Metadata JSON object', async () => {
    const result = await run([mockEvent]);
    
    expect(result).toEqual({
      success: true,
      message: 'Successfully retrieved External Domain Metadata',
      metadata: externalDomainMetadata
    });
  });

  it('should have the required record type and fields', async () => {
    const result = await run([mockEvent]);
    
    // Check if users record type exists
    expect(result.metadata.record_types).toHaveProperty('users');
    
    // Check if required fields exist with correct properties
    const usersFields = result.metadata.record_types.users.fields;
    
    expect(usersFields).toHaveProperty('full_name');
    expect(usersFields.full_name.type).toBe('text');
    expect(usersFields.full_name.name).toBe('Full Name');
    expect(usersFields.full_name.is_required).toBe(true);
    
    expect(usersFields).toHaveProperty('username');
    expect(usersFields.username.type).toBe('text');
    expect(usersFields.username.name).toBe('Username');
    expect(usersFields.username.is_required).toBe(true);
    
    // Check if cards record type exists
    expect(result.metadata.record_types).toHaveProperty('cards');
    
    // Check if required fields exist with correct properties for cards
    const cardsFields = result.metadata.record_types.cards.fields;
    
    expect(cardsFields).toHaveProperty('name');
    expect(cardsFields.name.type).toBe('text');
    expect(cardsFields.name.name).toBe('Name');
    expect(cardsFields.name.is_required).toBe(true);
    
    expect(cardsFields).toHaveProperty('url');
    expect(cardsFields.url.type).toBe('text');
    expect(cardsFields.url.name).toBe('URL');
    expect(cardsFields.url.is_required).toBe(true);
    
    expect(cardsFields).toHaveProperty('description');
    expect(cardsFields.description.type).toBe('rich_text');
    expect(cardsFields.description.name).toBe('Description');
    expect(cardsFields.description.is_required).toBe(true);
    
    expect(cardsFields).toHaveProperty('id_members');
    expect(cardsFields.id_members.type).toBe('reference');
    expect(cardsFields.id_members.name).toBe('ID Members');
    expect(cardsFields.id_members.is_required).toBe(true);
    expect(cardsFields.id_members.collection).toHaveProperty('max_length', 50);
    expect(cardsFields.id_members.reference.refers_to).toHaveProperty('#record:users');
  });
});