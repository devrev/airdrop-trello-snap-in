import { run } from './index';
import { FunctionInput } from '../../core/types';
import externalDomainMetadata from '../../external-domain-metadata.json';

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

  it('should return external domain metadata when given valid events', async () => {
    const result = await run([mockEvent]);
    
    expect(result).toEqual({
      external_domain_metadata: externalDomainMetadata,
      success: true,
      message: 'External domain metadata retrieved successfully'
    });
  });

  it('should return the correct structure for users record type', async () => {
    const result = await run([mockEvent]);
    
    expect(result.external_domain_metadata.record_types.users).toBeDefined();
    expect(result.external_domain_metadata.record_types.users.name).toBe('Users');
    expect(result.external_domain_metadata.record_types.users.fields.full_name).toEqual({
      name: 'Full Name',
      type: 'text',
      is_required: true
    });
    expect(result.external_domain_metadata.record_types.users.fields.username).toEqual({
      name: 'Username',
      type: 'text',
      is_required: true
    });
  });

  it('should return the correct structure for cards record type', async () => {
    const result = await run([mockEvent]);
    
    expect(result.external_domain_metadata.record_types.cards).toBeDefined();
    expect(result.external_domain_metadata.record_types.cards.name).toBe('Cards');
    expect(result.external_domain_metadata.record_types.cards.fields.name).toEqual({
      name: 'Name',
      type: 'text',
      is_required: true
    });
    expect(result.external_domain_metadata.record_types.cards.fields.url).toEqual({
      name: 'URL',
      type: 'text',
      is_required: true
    });
    expect(result.external_domain_metadata.record_types.cards.fields.description).toEqual({
      name: 'Description',
      type: 'rich_text',
      is_required: true
    });
    expect(result.external_domain_metadata.record_types.cards.fields.id_members).toEqual({
      name: 'ID Members',
      type: 'reference',
      is_required: true,
      collection: {
        max_length: 50
      },
      reference: {
        refers_to: {
          '#record:users': {}
        }
      }
    });
  });

  it('should have correct schema version', async () => {
    const result = await run([mockEvent]);
    
    expect(result.external_domain_metadata.schema_version).toBe('v0.2.0');
  });

  it('should have both users and cards record types', async () => {
    const result = await run([mockEvent]);
    
    expect(Object.keys(result.external_domain_metadata.record_types)).toEqual(['users', 'cards']);
  });

  it('should return an error when no events are provided', async () => {
    const result = await run([]);
    
    expect(result).toEqual({
      external_domain_metadata: {},
      success: false,
      message: 'Get external domain metadata failed: No events provided'
    });
  });

  it('should handle undefined events array', async () => {
    // @ts-ignore - Testing invalid input
    const result = await run(undefined);
    
    expect(result).toEqual({
      external_domain_metadata: {},
      success: false,
      message: 'Get external domain metadata failed: No events provided'
    });
  });
});