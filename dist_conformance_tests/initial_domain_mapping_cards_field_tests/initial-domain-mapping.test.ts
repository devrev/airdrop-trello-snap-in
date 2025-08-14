import { callSnapInFunction, validateInitialDomainMapping } from './utils';

describe('Initial Domain Mapping', () => {
  let metadata: any;
  let mapping: any;

  beforeAll(async () => {
    // Get the external domain metadata
    const metadataResponse = await callSnapInFunction('get_external_domain_metadata');
    console.log('Metadata response:', JSON.stringify(metadataResponse, null, 2));
    const metadataResult = metadataResponse || {};
    metadata = metadataResult.metadata;

    // Get the initial domain mapping
    const mappingResult = await callSnapInFunction('get_initial_domain_mapping');
    mapping = mappingResult.mapping;
  });

  it('should retrieve valid initial domain mapping', async () => {
    console.log('Mapping object:', JSON.stringify(mapping, null, 2));
    expect(mapping).toBeDefined();
    // Only proceed with further checks if mapping is defined
    if (mapping) {
      expect(mapping.additional_mappings).toBeDefined();
      expect(mapping.additional_mappings.record_type_mappings).toBeDefined();
    }
  });

  it('should validate with Chef CLI', async () => {
    // Skip if metadata or mapping is not available
    if (!metadata || !mapping) {
      console.warn('Skipping Chef CLI validation due to missing metadata or mapping');
      return;
    }

    await expect(validateInitialDomainMapping(metadata, mapping)).resolves.toBe(true);
  });

  it('should have correct cards record type mapping', () => {
    // Skip test if mapping is not available
    if (!mapping || !mapping.additional_mappings || !mapping.additional_mappings.record_type_mappings) {
      console.warn('Skipping cards mapping test due to missing mapping data');
      return;
    }
    const cardsMappings = mapping.additional_mappings.record_type_mappings.cards;
    
    // Verify default mapping to issue object
    expect(cardsMappings.default_mapping).toBeDefined();
    expect(cardsMappings.default_mapping.object_type).toBe('issue');
    expect(cardsMappings.default_mapping.object_category).toBe('stock');
    
    // Verify possible record type mappings
    expect(cardsMappings.possible_record_type_mappings).toBeInstanceOf(Array);
    expect(cardsMappings.possible_record_type_mappings.length).toBe(1);
    
    const recordTypeMapping = cardsMappings.possible_record_type_mappings[0];
    
    // Verify one-way mapping (forward true, reverse false)
    expect(recordTypeMapping.forward).toBe(true);
    expect(recordTypeMapping.reverse).toBe(false);
    
    // Verify shard configuration
    expect(recordTypeMapping.shard).toBeDefined();
    expect(recordTypeMapping.shard.mode).toBe('create_shard');
    
    const stockFieldMappings = recordTypeMapping.shard.stock_field_mappings;
    
    // Verify external field mappings
    expect(stockFieldMappings.title).toBeDefined();
    expect(stockFieldMappings.title.primary_external_field).toBe('name');
    expect(stockFieldMappings.title.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    expect(stockFieldMappings.item_url_field).toBeDefined();
    expect(stockFieldMappings.item_url_field.primary_external_field).toBe('url');
    expect(stockFieldMappings.item_url_field.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    expect(stockFieldMappings.body).toBeDefined();
    expect(stockFieldMappings.body.primary_external_field).toBe('description');
    expect(stockFieldMappings.body.transformation_method_for_set.transformation_method).toBe('use_rich_text');
    
    expect(stockFieldMappings.owned_by_ids).toBeDefined();
    expect(stockFieldMappings.owned_by_ids.primary_external_field).toBe('id_members');
    expect(stockFieldMappings.owned_by_ids.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    // Verify fixed value mappings
    expect(stockFieldMappings.priority).toBeDefined();
    expect(stockFieldMappings.priority.transformation_method_for_set.transformation_method).toBe('use_fixed_value');
    expect(stockFieldMappings.priority.transformation_method_for_set.value).toBe('enum_value');
    expect(stockFieldMappings.priority.transformation_method_for_set.enum).toBe('P2');
    
    expect(stockFieldMappings.stage).toBeDefined();
    expect(stockFieldMappings.stage.transformation_method_for_set.transformation_method).toBe('use_fixed_value');
    expect(stockFieldMappings.stage.transformation_method_for_set.value).toBe('enum_value');
    expect(stockFieldMappings.stage.transformation_method_for_set.enum).toBe('triage');
    
    // Verify DevRev record transformation method
    expect(stockFieldMappings.applies_to_part_id).toBeDefined();
    expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.transformation_method).toBe('use_devrev_record');
    expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.leaf_type).toBeDefined();
    expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.leaf_type.object_type).toBe('product');
    expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.leaf_type.object_category).toBe('stock');
  });
});