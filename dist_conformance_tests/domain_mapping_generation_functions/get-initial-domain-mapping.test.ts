import { createBaseEventPayload, sendRequestToSnapIn, setupCallbackServer, validateInitialDomainMapping } from './utils/test-utils';
import * as path from 'path';

describe('Get Initial Domain Mapping Function Tests', () => {
  let callbackServer: any;
  
  beforeAll(() => {
    // Setup callback server
    callbackServer = setupCallbackServer();
  });
  
  afterAll(() => {
    // Close callback server
    if (callbackServer && callbackServer.server) {
      callbackServer.server.close();
    }
  });
  
  it('should successfully retrieve and validate the initial domain mapping', async () => {
    // Create event payload
    const eventPayload = createBaseEventPayload();
    
    // Send request to snap-in server
    const response = await sendRequestToSnapIn('get_initial_domain_mapping', eventPayload);
    
    // Validate response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.message).toBe('Successfully retrieved Initial Domain Mapping');
    expect(response.function_result.mapping).toBeDefined();
    
    // Validate mapping structure
    const mapping = response.function_result.mapping;
    expect(mapping.additional_mappings).toBeDefined();
    expect(mapping.additional_mappings.record_type_mappings).toBeDefined();
    expect(mapping.additional_mappings.record_type_mappings.users).toBeDefined();
    
    // Validate users mapping
    const usersMapping = mapping.additional_mappings.record_type_mappings.users;
    expect(usersMapping.default_mapping).toBeDefined();
    expect(usersMapping.default_mapping.object_type).toBe('devu');
    expect(usersMapping.default_mapping.object_category).toBe('stock');
    
    // Validate possible record type mappings
    expect(usersMapping.possible_record_type_mappings).toBeDefined();
    expect(usersMapping.possible_record_type_mappings.length).toBeGreaterThan(0);
    
    const firstMapping = usersMapping.possible_record_type_mappings[0];
    expect(firstMapping.forward).toBe(true);
    expect(firstMapping.reverse).toBe(false);
    expect(firstMapping.devrev_leaf_type).toBe('devu');
    
    // Validate shard
    expect(firstMapping.shard).toBeDefined();
    expect(firstMapping.shard.mode).toBe('create_shard');
    expect(firstMapping.shard.devrev_leaf_type).toBeDefined();
    expect(firstMapping.shard.devrev_leaf_type.object_type).toBe('devu');
    expect(firstMapping.shard.devrev_leaf_type.object_category).toBe('stock');
    
    // Validate stock field mappings
    expect(firstMapping.shard.stock_field_mappings).toBeDefined();
    
    // Validate full_name mapping
    const fullNameMapping = firstMapping.shard.stock_field_mappings.full_name;
    expect(fullNameMapping).toBeDefined();
    expect(fullNameMapping.forward).toBe(true);
    expect(fullNameMapping.reverse).toBe(false);
    expect(fullNameMapping.primary_external_field).toBe('full_name');
    expect(fullNameMapping.transformation_method_for_set).toBeDefined();
    expect(fullNameMapping.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    // Validate display_name mapping
    const displayNameMapping = firstMapping.shard.stock_field_mappings.display_name;
    expect(displayNameMapping).toBeDefined();
    expect(displayNameMapping.forward).toBe(true);
    expect(displayNameMapping.reverse).toBe(false);
    expect(displayNameMapping.primary_external_field).toBe('username');
    expect(displayNameMapping.transformation_method_for_set).toBeDefined();
    expect(displayNameMapping.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    // Validate with Chef CLI
    const externalDomainMetadataPath = path.join(__dirname, 'test-data/external-domain-metadata.json');
    const isValid = await validateInitialDomainMapping(mapping, externalDomainMetadataPath);
    expect(isValid).toBe(true);
  });
});