import { callTestServer, createFunctionEvent, validateWithChefCli } from './utils';

describe('Initial Domain Mappings Tests', () => {
  // Test 1: Basic connectivity test
  test('Test server is accessible', async () => {
    const event = createFunctionEvent('health_check');
    const response = await callTestServer(event);
    
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.status).toBe('operational');
  });

  // Test 2: get_initial_domain_mappings function returns success
  test('get_initial_domain_mappings returns success response', async () => {
    const event = createFunctionEvent('get_initial_domain_mappings');
    const response = await callTestServer(event);
    
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.mappings).toBeDefined();
  });

  // Test 3: Validate initial domain mappings with Chef CLI
  test('Initial domain mappings pass Chef CLI validation', async () => {
    // Get external domain metadata
    const metadataEvent = createFunctionEvent('get_external_domain_metadata');
    const metadataResponse = await callTestServer(metadataEvent);
    expect(metadataResponse.function_result.success).toBe(true);
    const metadata = metadataResponse.function_result.metadata;

    // Get initial domain mappings
    const mappingsEvent = createFunctionEvent('get_initial_domain_mappings');
    const mappingsResponse = await callTestServer(mappingsEvent);
    expect(mappingsResponse.function_result.success).toBe(true);
    const mappings = mappingsResponse.function_result.mappings;

    // Validate with Chef CLI
    try {
      const validationResult = await validateWithChefCli(metadata, mappings);
      
      // Check that we got a non-empty result
      expect(validationResult).toBeDefined();
      expect(Array.isArray(validationResult)).toBe(true);
      expect(validationResult.length).toBeGreaterThan(0);
      
      // Check that there are no deficiencies or warnings
      const firstResult = validationResult[0];
      expect(firstResult).toHaveProperty('RemainingDeficiencies');
      expect(firstResult).toHaveProperty('Warnings');
      expect(firstResult.RemainingDeficiencies).toBeNull();
      expect(firstResult.Warnings).toBeNull();
    } catch (error) {
      // If Chef CLI is not available, this test will be marked as failed
      fail(`Chef CLI validation failed: ${error}`);
    }
  });

  // Test 4: Verify cards record type mapping
  test('Cards record type mapping is correctly configured', async () => {
    const event = createFunctionEvent('get_initial_domain_mappings');
    const response = await callTestServer(event);
    
    const mappings = response.function_result.mappings;
    
    // Check that cards record type mapping exists
    expect(mappings.additional_mappings.record_type_mappings).toHaveProperty('cards');
    
    const cardsMapping = mappings.additional_mappings.record_type_mappings.cards;
    
    // Check default mapping
    expect(cardsMapping.default_mapping).toBeDefined();
    expect(cardsMapping.default_mapping.object_type).toBe('issue');
    expect(cardsMapping.default_mapping.object_category).toBe('stock');
    
    // Check possible record type mappings
    expect(cardsMapping.possible_record_type_mappings).toBeDefined();
    expect(Array.isArray(cardsMapping.possible_record_type_mappings)).toBe(true);
    expect(cardsMapping.possible_record_type_mappings.length).toBe(1);
    
    const possibleMapping = cardsMapping.possible_record_type_mappings[0];
    
    // Check that mapping is one-way
    expect(possibleMapping.forward).toBe(true);
    expect(possibleMapping.reverse).toBe(false);
    
    // Check that a new recipe blueprint shard is created
    expect(possibleMapping.shard).toBeDefined();
    expect(possibleMapping.shard.mode).toBe('create_shard');
  });

  // Test 5: Verify stock field mappings
  test('Stock field mappings are correctly configured', async () => {
    const event = createFunctionEvent('get_initial_domain_mappings');
    const response = await callTestServer(event);
    
    const mappings = response.function_result.mappings;
    const cardsMapping = mappings.additional_mappings.record_type_mappings.cards;
    const possibleMapping = cardsMapping.possible_record_type_mappings[0];
    const stockFieldMappings = possibleMapping.shard.stock_field_mappings;
    
    // Check External Transformation Method fields
    // name -> title
    expect(stockFieldMappings.title).toBeDefined();
    expect(stockFieldMappings.title.primary_external_field).toBe('name');
    expect(stockFieldMappings.title.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    // url -> item_url_field
    expect(stockFieldMappings.item_url_field).toBeDefined();
    expect(stockFieldMappings.item_url_field.primary_external_field).toBe('url');
    expect(stockFieldMappings.item_url_field.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    // description -> body (rich text)
    expect(stockFieldMappings.body).toBeDefined();
    expect(stockFieldMappings.body.primary_external_field).toBe('description');
    expect(stockFieldMappings.body.transformation_method_for_set.transformation_method).toBe('use_rich_text');
    
    // id_members -> owned_by_ids
    expect(stockFieldMappings.owned_by_ids).toBeDefined();
    expect(stockFieldMappings.owned_by_ids.primary_external_field).toBe('id_members');
    expect(stockFieldMappings.owned_by_ids.transformation_method_for_set.transformation_method).toBe('use_directly');
    
    // Check Fixed Transformation Method fields
    // priority with fixed value "P2"
    expect(stockFieldMappings.priority).toBeDefined();
    expect(stockFieldMappings.priority.transformation_method_for_set.transformation_method).toBe('use_fixed_value');
    expect(stockFieldMappings.priority.transformation_method_for_set.value).toBe('enum_value');
    expect(stockFieldMappings.priority.transformation_method_for_set.enum).toBe('P2');
    
    // stage with fixed value "triage"
    expect(stockFieldMappings.stage).toBeDefined();
    expect(stockFieldMappings.stage.transformation_method_for_set.transformation_method).toBe('use_fixed_value');
    expect(stockFieldMappings.stage.transformation_method_for_set.value).toBe('enum_value');
    expect(stockFieldMappings.stage.transformation_method_for_set.enum).toBe('triage');
    
    // Check DevRev Record Transformation Method fields
    // applies_to_part_id referring to the "product" object type
    expect(stockFieldMappings.applies_to_part_id).toBeDefined();
    expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.transformation_method).toBe('use_devrev_record');
    expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.leaf_type).toBeDefined();
    expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.leaf_type.object_type).toBe('product');
    expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.leaf_type.object_category).toBe('stock');
  });
});