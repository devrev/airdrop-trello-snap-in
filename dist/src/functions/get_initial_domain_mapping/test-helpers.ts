import { FunctionInput } from '../../core/types';
import initialDomainMapping from '../../initial-domain-mapping.json';

export const createMockEvent = (overrides: any = {}): FunctionInput => ({
  payload: {},
  context: {
    dev_oid: 'test-dev-oid',
    source_id: 'test-source-id',
    snap_in_id: 'test-snap-in-id',
    snap_in_version_id: 'test-snap-in-version-id',
    service_account_id: 'test-service-account-id',
    secrets: {
      service_account_token: 'test-token'
    },
    ...overrides.context
  },
  execution_metadata: {
    request_id: 'test-request-id',
    function_name: 'get_initial_domain_mapping',
    event_type: 'test-event-type',
    devrev_endpoint: 'https://api.devrev.ai',
    ...overrides.execution_metadata
  },
  input_data: {
    global_values: {},
    event_sources: {},
    ...overrides.input_data
  }
});

export const getUsersMapping = (domainMapping: any) => {
  return domainMapping.additional_mappings.record_type_mappings.users;
};

export const getCardsMapping = (domainMapping: any) => {
  return domainMapping.additional_mappings.record_type_mappings.cards;
};

export const getUsersStockFieldMappings = (domainMapping: any) => {
  const usersMapping = getUsersMapping(domainMapping);
  return usersMapping.possible_record_type_mappings[0].shard.stock_field_mappings;
};

export const getCardsStockFieldMappings = (domainMapping: any) => {
  const cardsMapping = getCardsMapping(domainMapping);
  return cardsMapping.possible_record_type_mappings[0].shard.stock_field_mappings;
};

export const getUsersShard = (domainMapping: any) => {
  const usersMapping = getUsersMapping(domainMapping);
  return usersMapping.possible_record_type_mappings[0].shard;
};

export const getCardsShard = (domainMapping: any) => {
  const cardsMapping = getCardsMapping(domainMapping);
  return cardsMapping.possible_record_type_mappings[0].shard;
};

export const expectedUsersDefaultMapping = {
  object_category: 'stock',
  object_type: 'devu'
};

export const expectedCardsDefaultMapping = {
  object_category: 'stock',
  object_type: 'issue'
};

export const expectedFullNameMapping = {
  forward: true,
  reverse: false,
  primary_external_field: 'full_name',
  transformation_method_for_set: {
    transformation_method: 'use_directly'
  }
};

export const expectedDisplayNameMapping = {
  forward: true,
  reverse: false,
  primary_external_field: 'username',
  transformation_method_for_set: {
    transformation_method: 'use_directly'
  }
};

export const expectedTitleMapping = {
  forward: true,
  reverse: false,
  primary_external_field: 'name',
  transformation_method_for_set: {
    transformation_method: 'use_directly'
  }
};

export const expectedItemUrlFieldMapping = {
  forward: true,
  reverse: false,
  primary_external_field: 'url',
  transformation_method_for_set: {
    transformation_method: 'use_directly'
  }
};

export const expectedBodyMapping = {
  forward: true,
  reverse: false,
  primary_external_field: 'description',
  transformation_method_for_set: {
    transformation_method: 'use_rich_text'
  }
};

export const expectedOwnedByIdsMapping = {
  forward: true,
  reverse: false,
  primary_external_field: 'id_members',
  transformation_method_for_set: {
    transformation_method: 'use_directly'
  }
};

export const expectedPriorityMapping = {
  forward: true,
  reverse: false,
  transformation_method_for_set: {
    enum: 'P2',
    transformation_method: 'use_fixed_value',
    value: 'enum_value'
  }
};

export const expectedStageMapping = {
  forward: true,
  reverse: false,
  transformation_method_for_set: {
    enum: 'triage',
    transformation_method: 'use_fixed_value',
    value: 'enum_value'
  }
};

export const expectedAppliesToPartIdMapping = {
  forward: true,
  reverse: false,
  transformation_method_for_set: {
    transformation_method: 'use_devrev_record',
    leaf_type: {
      object_category: 'stock',
      object_type: 'product'
    }
  }
};

export const expectedDevrevLeafType = {
  object_category: 'stock',
  object_type: 'devu'
};

export const expectedCardsDevrevLeafType = {
  object_category: 'stock',
  object_type: 'issue'
};