import { callSnapInFunction } from './utils';

describe('External Domain Metadata', () => {
  it('should retrieve valid external domain metadata', async () => {
    const result = await callSnapInFunction('get_external_domain_metadata');
    console.log('Domain metadata result:', JSON.stringify(result, null, 2));
    
    expect(result).toBeDefined();

    // If result has a status property, check it
    if (result && result.status) {
      expect(result.status).toBe('success');
    }

    // Check if metadata exists either directly or as a nested property
    const metadata = result.metadata || result;
    expect(metadata).toBeDefined();

    if (metadata) {
      // Verify schema version
      expect(metadata.schema_version).toBeDefined();
      
      // Verify record types
      expect(metadata.record_types).toBeDefined();
      
      if (metadata.record_types) {
        // Verify users record type
        expect(metadata.record_types.users).toBeDefined();
        if (metadata.record_types.users) {
          expect(metadata.record_types.users.fields).toBeDefined();
          if (metadata.record_types.users.fields) {
            expect(metadata.record_types.users.fields.full_name).toBeDefined();
            expect(metadata.record_types.users.fields.username).toBeDefined();
          }
        }
        
        // Verify cards record type
        expect(metadata.record_types.cards).toBeDefined();
        if (metadata.record_types.cards) {
          expect(metadata.record_types.cards.fields).toBeDefined();
          if (metadata.record_types.cards.fields) {
            expect(metadata.record_types.cards.fields.name).toBeDefined();
            expect(metadata.record_types.cards.fields.url).toBeDefined();
            expect(metadata.record_types.cards.fields.description).toBeDefined();
            expect(metadata.record_types.cards.fields.id_members).toBeDefined();
          }
        }
      }
    }
  });
});