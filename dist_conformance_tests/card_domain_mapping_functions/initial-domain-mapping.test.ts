import fs from 'fs';
import path from 'path';
import {
  createBaseEvent,
  sendToSnapInServer,
  validateInitialDomainMapping,
  TRELLO_API_KEY,
  TRELLO_TOKEN,
  TRELLO_ORGANIZATION_ID
} from './utils/test-utils';

describe('Initial Domain Mapping Tests', () => {
  // Check if required environment variables are set
  beforeAll(() => {
    expect(TRELLO_API_KEY).toBeTruthy();
    expect(TRELLO_TOKEN).toBeTruthy();
    expect(TRELLO_ORGANIZATION_ID).toBeTruthy();
  });

  test('Initial domain mapping should be valid according to Chef CLI', async () => {
    // Create event for get_initial_domain_mapping function
    const event = createBaseEvent('get_initial_domain_mapping');
    
    // Create event for get_external_domain_metadata function
    const metadataEvent = createBaseEvent('get_external_domain_metadata');
    
    // Get external domain metadata
    const metadataResponse = await sendToSnapInServer(metadataEvent);
    
    // Log the response for debugging
    console.log('External domain metadata response:', JSON.stringify(metadataResponse, null, 2));
    
    // Check if we have a valid response
    expect(metadataResponse).toBeTruthy();
    expect(typeof metadataResponse).toBe('object');
    const metadata = metadataResponse.metadata || metadataResponse;
    expect(metadata).toBeTruthy();

    // Save external domain metadata to a temporary file
    const metadataPath = path.join(__dirname, 'temp_external_domain_metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    try {
      // Get initial domain mapping
      const mappingResponse = await sendToSnapInServer(event);
      
      // Log the response for debugging
      console.log('Initial domain mapping response:', JSON.stringify(mappingResponse, null, 2));
      
      // Check if we have a valid response
      expect(mappingResponse).toBeTruthy();
      expect(typeof mappingResponse).toBe('object');
      const mapping = mappingResponse.mapping || mappingResponse;
      expect(mapping).toBeTruthy();
      
      // Validate the initial domain mapping using Chef CLI
      const validationResult = await validateInitialDomainMapping(
        mapping,
        metadataPath
      );
      
      expect(validationResult.isValid).toBe(true);
      
      // Verify that the mapping meets the functional requirements
      // mapping is already defined above
      
      // Check that cards record type mapping exists
      expect(mapping.additional_mappings.record_type_mappings.cards).toBeDefined();
      
      const cardsMapping = mapping.additional_mappings.record_type_mappings.cards;
      
      // Check default mapping
      expect(cardsMapping.default_mapping.object_type).toBe('issue');
      expect(cardsMapping.default_mapping.object_category).toBe('stock');
      
      // Check possible_record_type_mappings
      expect(cardsMapping.possible_record_type_mappings.length).toBe(1);
      expect(cardsMapping.possible_record_type_mappings[0].forward).toBe(true);
      expect(cardsMapping.possible_record_type_mappings[0].reverse).toBe(false);
      
      // Get the shard
      const shard = cardsMapping.possible_record_type_mappings[0].shard;
      expect(shard.mode).toBe('create_shard');
      
      // Check stock field mappings
      const stockFieldMappings = shard.stock_field_mappings;
      
      // Check External Transformation Method mappings
      expect(stockFieldMappings.title.primary_external_field).toBe('name');
      expect(stockFieldMappings.title.transformation_method_for_set.transformation_method).toBe('use_directly');
      
      expect(stockFieldMappings.item_url_field.primary_external_field).toBe('url');
      expect(stockFieldMappings.item_url_field.transformation_method_for_set.transformation_method).toBe('use_directly');
      
      expect(stockFieldMappings.body.primary_external_field).toBe('description');
      expect(stockFieldMappings.body.transformation_method_for_set.transformation_method).toBe('use_rich_text');
      
      expect(stockFieldMappings.owned_by_ids.primary_external_field).toBe('id_members');
      expect(stockFieldMappings.owned_by_ids.transformation_method_for_set.transformation_method).toBe('use_directly');
      
      // Check Fixed Transformation Method mappings
      expect(stockFieldMappings.priority.transformation_method_for_set.transformation_method).toBe('use_fixed_value');
      expect(stockFieldMappings.priority.transformation_method_for_set.value).toBe('enum_value');
      expect(stockFieldMappings.priority.transformation_method_for_set.enum).toBe('P2');
      
      expect(stockFieldMappings.stage.transformation_method_for_set.transformation_method).toBe('use_fixed_value');
      expect(stockFieldMappings.stage.transformation_method_for_set.value).toBe('enum_value');
      expect(stockFieldMappings.stage.transformation_method_for_set.enum).toBe('triage');
      
      // Check DevRev Record Transformation Method mappings
      expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.transformation_method).toBe('use_devrev_record');
      expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.leaf_type.object_type).toBe('product');
      expect(stockFieldMappings.applies_to_part_id.transformation_method_for_set.leaf_type.object_category).toBe('stock');
    } finally {
      // Clean up temporary file
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }
    }
  });
});