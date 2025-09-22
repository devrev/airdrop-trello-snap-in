import { run } from './index';
import { FunctionInput } from '../../core/types';
import initialDomainMapping from './initial_domain_mapping.json';

describe('get_initial_domain_mapping function', () => {
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
      function_name: 'get_initial_domain_mapping',
      event_type: 'test-event-type',
      devrev_endpoint: 'https://api.devrev.ai'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  it('should return the Initial Domain Mapping JSON object', async () => {
    const result = await run([mockEvent]);
    
    expect(result).toEqual({
      success: true,
      message: 'Successfully retrieved Initial Domain Mapping',
      mapping: initialDomainMapping
    });
  });

  it('should have the required record type mappings', async () => {
    const result = await run([mockEvent]);
    
    // Check if users record type mapping exists
    expect(result.mapping.additional_mappings.record_type_mappings).toHaveProperty('users');
    
    // Check default mapping
    const usersMapping = result.mapping.additional_mappings.record_type_mappings.users;
    expect(usersMapping.default_mapping.object_type).toBe('devu');
    expect(usersMapping.default_mapping.object_category).toBe('stock');
    
    // Check possible record type mappings
    expect(usersMapping.possible_record_type_mappings).toHaveLength(1);
    const mapping = usersMapping.possible_record_type_mappings[0];
    expect(mapping.forward).toBe(true);
    expect(mapping.reverse).toBe(false);
    expect(mapping.devrev_leaf_type).toBe('devu');
    
    // Check shard mode
    expect(mapping.shard.mode).toBe('create_shard');
    
    // Check stock field mappings
    const stockFieldMappings = mapping.shard.stock_field_mappings;
    
    // Check display_name mapping
    expect(stockFieldMappings).toHaveProperty('display_name');
    expect(stockFieldMappings.display_name.forward).toBe(true);
    expect(stockFieldMappings.display_name.reverse).toBe(false);
    expect(stockFieldMappings.display_name.primary_external_field).toBe('username');
    expect(stockFieldMappings.display_name.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    // Check full_name mapping
    expect(stockFieldMappings).toHaveProperty('full_name');
    expect(stockFieldMappings.full_name.forward).toBe(true);
    expect(stockFieldMappings.full_name.reverse).toBe(false);
    expect(stockFieldMappings.full_name.primary_external_field).toBe('full_name');
    expect(stockFieldMappings.full_name.transformation_method_for_set.transformation_method).toBe('use_directly');
  });

  it('should have the required cards record type mapping', async () => {
    const result = await run([mockEvent]);
    
    // Check if cards record type mapping exists
    expect(result.mapping.additional_mappings.record_type_mappings).toHaveProperty('cards');
    
    // Check default mapping
    const cardsMapping = result.mapping.additional_mappings.record_type_mappings.cards;
    expect(cardsMapping.default_mapping.object_type).toBe('issue');
    expect(cardsMapping.default_mapping.object_category).toBe('stock');
    
    // Check possible record type mappings
    expect(cardsMapping.possible_record_type_mappings).toHaveLength(1);
    const mapping = cardsMapping.possible_record_type_mappings[0];
    expect(mapping.forward).toBe(true);
    expect(mapping.reverse).toBe(false);
    expect(mapping.devrev_leaf_type).toBe('issue');
    
    // Check shard mode
    expect(mapping.shard.mode).toBe('create_shard');
    
    // Check stock field mappings
    const stockFieldMappings = mapping.shard.stock_field_mappings;
    
    // Check title mapping (External Transformation Method)
    expect(stockFieldMappings).toHaveProperty('title');
    expect(stockFieldMappings.title.forward).toBe(true);
    expect(stockFieldMappings.title.reverse).toBe(false);
    expect(stockFieldMappings.title.primary_external_field).toBe('name');
    expect(stockFieldMappings.title.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    // Check item_url_field mapping (External Transformation Method)
    expect(stockFieldMappings).toHaveProperty('item_url_field');
    expect(stockFieldMappings.item_url_field.forward).toBe(true);
    expect(stockFieldMappings.item_url_field.reverse).toBe(false);
    expect(stockFieldMappings.item_url_field.primary_external_field).toBe('url');
    expect(stockFieldMappings.item_url_field.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    // Check body mapping (External Transformation Method - rich text)
    expect(stockFieldMappings).toHaveProperty('body');
    expect(stockFieldMappings.body.forward).toBe(true);
    expect(stockFieldMappings.body.reverse).toBe(false);
    expect(stockFieldMappings.body.primary_external_field).toBe('description');
    expect(stockFieldMappings.body.transformation_method_for_set.transformation_method).toBe('use_rich_text');
    
    // Check owned_by_ids mapping (External Transformation Method)
    expect(stockFieldMappings).toHaveProperty('owned_by_ids');
    expect(stockFieldMappings.owned_by_ids.forward).toBe(true);
    expect(stockFieldMappings.owned_by_ids.reverse).toBe(false);
    expect(stockFieldMappings.owned_by_ids.primary_external_field).toBe('id_members');
    expect(stockFieldMappings.owned_by_ids.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    // Check priority mapping (Fixed Transformation Method)
    expect(stockFieldMappings).toHaveProperty('priority');
    expect(stockFieldMappings.priority.transformation_method_for_set.transformation_method).toBe('use_fixed_value');
    expect(stockFieldMappings.priority.transformation_method_for_set.enum).toBe('P2');
    
    // Check stage mapping (Fixed Transformation Method)
    expect(stockFieldMappings).toHaveProperty('stage');
    expect(stockFieldMappings.stage.transformation_method_for_set.transformation_method).toBe('use_fixed_value');
    expect(stockFieldMappings.stage.transformation_method_for_set.enum).toBe('triage');
    
    // Check applies_to_part_id mapping (DevRev Record Transformation Method)
    expect(stockFieldMappings).toHaveProperty('applies_to_part_id');
    expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.transformation_method).toBe('use_devrev_record');
    expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.leaf_type.object_type).toBe('product');
    expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.leaf_type.object_category).toBe('stock');
  });
});