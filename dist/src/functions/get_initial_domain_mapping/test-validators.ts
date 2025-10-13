/**
 * Domain-specific validation functions for initial domain mapping tests
 */

/**
 * Validates the mapping structure and schema
 */
export const validateMappingStructure = (mapping: any) => {
  expect(mapping).toHaveProperty('additional_mappings');
  expect(mapping.additional_mappings).toHaveProperty('record_type_mappings');
  expect(mapping.additional_mappings.record_type_mappings).toHaveProperty('users');
  expect(mapping.additional_mappings.record_type_mappings).toHaveProperty('cards');
};

/**
 * Validates users mapping configuration
 */
export const validateUsersMapping = (mapping: any) => {
  const usersMapping = mapping.additional_mappings.record_type_mappings.users;
  
  expect(usersMapping).toHaveProperty('default_mapping');
  expect(usersMapping.default_mapping).toEqual({
    object_category: 'stock',
    object_type: 'devu',
  });

  expect(usersMapping).toHaveProperty('possible_record_type_mappings');
  expect(usersMapping.possible_record_type_mappings).toHaveLength(1);
};

/**
 * Validates cards mapping configuration
 */
export const validateCardsMapping = (mapping: any) => {
  const cardsMapping = mapping.additional_mappings.record_type_mappings.cards;
  
  expect(cardsMapping).toHaveProperty('default_mapping');
  expect(cardsMapping.default_mapping).toEqual({
    object_category: 'stock',
    object_type: 'issue',
  });

  expect(cardsMapping).toHaveProperty('possible_record_type_mappings');
  expect(cardsMapping.possible_record_type_mappings).toHaveLength(1);

  const possibleMapping = cardsMapping.possible_record_type_mappings[0];
  expect(possibleMapping.devrev_leaf_type).toBe('issue');
};

/**
 * Validates the possible record type mapping configuration
 */
export const validatePossibleRecordTypeMapping = (mapping: any) => {
  const possibleMapping = mapping.additional_mappings.record_type_mappings.users.possible_record_type_mappings[0];
  
  expect(possibleMapping.devrev_leaf_type).toBe('devu');
  expect(possibleMapping.forward).toBe(true);
  expect(possibleMapping.reverse).toBe(false);
  expect(possibleMapping.shard.mode).toBe('create_shard');
};

/**
 * Validates cards possible record type mapping configuration
 */
export const validateCardsPossibleRecordTypeMapping = (mapping: any) => {
  const possibleMapping = mapping.additional_mappings.record_type_mappings.cards.possible_record_type_mappings[0];
  
  expect(possibleMapping.devrev_leaf_type).toBe('issue');
  expect(possibleMapping.forward).toBe(true);
  expect(possibleMapping.reverse).toBe(false);
  expect(possibleMapping.shard.mode).toBe('create_shard');
};

/**
 * Validates stock field mappings
 */
export const validateStockFieldMappings = (mapping: any) => {
  const stockFieldMappings = mapping.additional_mappings.record_type_mappings.users.possible_record_type_mappings[0].shard.stock_field_mappings;
  
  expect(stockFieldMappings).toHaveProperty('full_name');
  expect(stockFieldMappings.full_name).toEqual({
    forward: true,
    reverse: false,
    primary_external_field: 'full_name',
    transformation_method_for_set: {
      transformation_method: 'use_directly',
    },
  });

  expect(stockFieldMappings).toHaveProperty('display_name');
  expect(stockFieldMappings.display_name).toEqual({
    forward: true,
    reverse: false,
    primary_external_field: 'username',
    transformation_method_for_set: {
      transformation_method: 'use_directly',
    },
  });
};

/**
 * Validates cards stock field mappings
 */
export const validateCardsStockFieldMappings = (mapping: any) => {
  const stockFieldMappings = mapping.additional_mappings.record_type_mappings.cards.possible_record_type_mappings[0].shard.stock_field_mappings;
  
  // External transformation methods
  expect(stockFieldMappings).toHaveProperty('title');
  expect(stockFieldMappings.title).toEqual({
    forward: true,
    reverse: false,
    primary_external_field: 'name',
    transformation_method_for_set: {
      transformation_method: 'use_directly',
    },
  });

  expect(stockFieldMappings).toHaveProperty('item_url_field');
  expect(stockFieldMappings.item_url_field).toEqual({
    forward: true,
    reverse: false,
    primary_external_field: 'url',
    transformation_method_for_set: {
      transformation_method: 'use_directly',
    },
  });

  expect(stockFieldMappings).toHaveProperty('body');
  expect(stockFieldMappings.body).toEqual({
    forward: true,
    reverse: false,
    primary_external_field: 'description',
    transformation_method_for_set: {
      transformation_method: 'use_rich_text',
    },
  });

  expect(stockFieldMappings).toHaveProperty('owned_by_ids');
  expect(stockFieldMappings.owned_by_ids).toEqual({
    forward: true,
    reverse: false,
    primary_external_field: 'id_members',
    transformation_method_for_set: {
      transformation_method: 'use_directly',
    },
  });

  expect(stockFieldMappings).toHaveProperty('created_by_id');
  expect(stockFieldMappings.created_by_id).toEqual({
    forward: true,
    reverse: false,
    primary_external_field: 'created_by',
    transformation_method_for_set: {
      transformation_method: 'use_directly',
    },
  });

  // Fixed transformation methods
  expect(stockFieldMappings).toHaveProperty('priority');
  expect(stockFieldMappings.priority).toEqual({
    forward: true,
    reverse: false,
    transformation_method_for_set: {
      transformation_method: 'use_fixed_value',
      value: 'enum_value',
      enum: 'P2',
    },
  });

  expect(stockFieldMappings).toHaveProperty('stage');
  expect(stockFieldMappings.stage).toEqual({
    forward: true,
    reverse: false,
    transformation_method_for_set: {
      transformation_method: 'use_fixed_value',
      value: 'enum_value',
      enum: 'triage',
    },
  });

  // DevRev record transformation method
  expect(stockFieldMappings).toHaveProperty('applies_to_part_id');
  expect(stockFieldMappings.applies_to_part_id).toEqual({
    forward: true,
    reverse: false,
    transformation_method_for_set: {
      transformation_method: 'use_devrev_record',
      leaf_type: {
        object_category: 'stock',
        object_type: 'product',
      },
    },
  });
};

/**
 * Validates field mapping directions
 */
export const validateMappingDirections = (mapping: any) => {
  const stockFieldMappings = mapping.additional_mappings.record_type_mappings.users.possible_record_type_mappings[0].shard.stock_field_mappings;
  
  // Check that all mappings are forward-only
  expect(stockFieldMappings.full_name.forward).toBe(true);
  expect(stockFieldMappings.full_name.reverse).toBe(false);
  expect(stockFieldMappings.display_name.forward).toBe(true);
  expect(stockFieldMappings.display_name.reverse).toBe(false);
};

/**
 * Validates cards field mapping directions
 */
export const validateCardsMappingDirections = (mapping: any) => {
  const stockFieldMappings = mapping.additional_mappings.record_type_mappings.cards.possible_record_type_mappings[0].shard.stock_field_mappings;
  
  // Check that all mappings are forward-only
  Object.keys(stockFieldMappings).forEach(fieldName => {
    expect(stockFieldMappings[fieldName].forward).toBe(true);
    expect(stockFieldMappings[fieldName].reverse).toBe(false);
  });
};

/**
 * Validates that both users and cards mappings exist
 */
export const validateBothRecordTypeMappings = (mapping: any) => {
  const recordTypes = Object.keys(mapping.additional_mappings.record_type_mappings);
  expect(recordTypes).toEqual(expect.arrayContaining(['users', 'cards']));
  expect(recordTypes).toHaveLength(2);
};

/**
 * Validates transformation methods
 */
export const validateTransformationMethods = (mapping: any) => {
  const stockFieldMappings = mapping.additional_mappings.record_type_mappings.users.possible_record_type_mappings[0].shard.stock_field_mappings;
  
  // Check that all mappings use use_directly transformation method
  expect(stockFieldMappings.full_name.transformation_method_for_set.transformation_method).toBe('use_directly');
  expect(stockFieldMappings.display_name.transformation_method_for_set.transformation_method).toBe('use_directly');
};