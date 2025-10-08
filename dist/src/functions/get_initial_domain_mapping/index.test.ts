import { run } from './index';
import initialDomainMapping from '../../initial-domain-mapping.json';
import {
  createMockEvent,
  getUsersMapping,
  getCardsMapping,
  getUsersStockFieldMappings,
  getCardsStockFieldMappings,
  getUsersShard,
  getCardsShard,
  expectedUsersDefaultMapping,
  expectedCardsDefaultMapping,
  expectedFullNameMapping,
  expectedDisplayNameMapping,
  expectedTitleMapping,
  expectedItemUrlFieldMapping,
  expectedBodyMapping,
  expectedOwnedByIdsMapping,
  expectedPriorityMapping,
  expectedStageMapping,
  expectedAppliesToPartIdMapping,
  expectedDevrevLeafType,
  expectedCardsDevrevLeafType
} from './test-helpers';

describe('get_initial_domain_mapping function', () => {
  it('should return initial domain mapping when given valid events', async () => {
    const result = await run([createMockEvent()]);
    
    expect(result).toEqual({
      initial_domain_mapping: initialDomainMapping,
      success: true,
      message: 'Initial domain mapping retrieved successfully'
    });
  });

  it('should return the correct structure for users record type mapping', async () => {
    const result = await run([createMockEvent()]);
    const usersMapping = getUsersMapping(result.initial_domain_mapping);
    
    expect(usersMapping).toBeDefined();
    expect(usersMapping.default_mapping).toEqual(expectedUsersDefaultMapping);
    
    expect(usersMapping.possible_record_type_mappings).toHaveLength(1);
    
    const possibleMapping = usersMapping.possible_record_type_mappings[0];
    expect(possibleMapping.devrev_leaf_type).toBe('devu');
    expect(possibleMapping.forward).toBe(true);
    expect(possibleMapping.reverse).toBe(false);
    expect(possibleMapping.shard.mode).toBe('create_shard');
  });

  it('should have correct stock field mappings for full_name', async () => {
    const result = await run([createMockEvent()]);
    const stockFieldMappings = getUsersStockFieldMappings(result.initial_domain_mapping);
    
    expect(stockFieldMappings.full_name).toEqual(expectedFullNameMapping);
  });

  it('should have correct stock field mappings for display_name', async () => {
    const result = await run([createMockEvent()]);
    const stockFieldMappings = getUsersStockFieldMappings(result.initial_domain_mapping);
    
    expect(stockFieldMappings.display_name).toEqual(expectedDisplayNameMapping);
  });

  it('should have correct devrev_leaf_type in shard', async () => {
    const result = await run([createMockEvent()]);
    const shard = getUsersShard(result.initial_domain_mapping);
    
    expect(shard.devrev_leaf_type).toEqual(expectedDevrevLeafType);
  });

  it('should return the correct structure for cards record type mapping', async () => {
    const result = await run([createMockEvent()]);
    const cardsMapping = getCardsMapping(result.initial_domain_mapping);
    
    expect(cardsMapping).toBeDefined();
    expect(cardsMapping.default_mapping).toEqual(expectedCardsDefaultMapping);
    
    expect(cardsMapping.possible_record_type_mappings).toHaveLength(1);
    
    const possibleMapping = cardsMapping.possible_record_type_mappings[0];
    expect(possibleMapping.devrev_leaf_type).toBe('issue');
    expect(possibleMapping.forward).toBe(true);
    expect(possibleMapping.reverse).toBe(false);
    expect(possibleMapping.shard.mode).toBe('create_shard');
  });

  it('should have correct stock field mappings for cards external fields', async () => {
    const result = await run([createMockEvent()]);
    const stockFieldMappings = getCardsStockFieldMappings(result.initial_domain_mapping);
    
    expect(stockFieldMappings.title).toEqual(expectedTitleMapping);
    expect(stockFieldMappings.item_url_field).toEqual(expectedItemUrlFieldMapping);
    expect(stockFieldMappings.body).toEqual(expectedBodyMapping);
    expect(stockFieldMappings.owned_by_ids).toEqual(expectedOwnedByIdsMapping);
  });

  it('should have correct stock field mappings for cards fixed values', async () => {
    const result = await run([createMockEvent()]);
    const stockFieldMappings = getCardsStockFieldMappings(result.initial_domain_mapping);
    
    expect(stockFieldMappings.priority).toEqual(expectedPriorityMapping);
    expect(stockFieldMappings.stage).toEqual(expectedStageMapping);
  });

  it('should have correct stock field mapping for cards DevRev record reference', async () => {
    const result = await run([createMockEvent()]);
    const stockFieldMappings = getCardsStockFieldMappings(result.initial_domain_mapping);
    
    expect(stockFieldMappings.applies_to_part_id).toEqual(expectedAppliesToPartIdMapping);
  });

  it('should have correct devrev_leaf_type in cards shard', async () => {
    const result = await run([createMockEvent()]);
    const shard = getCardsShard(result.initial_domain_mapping);
    
    expect(shard.devrev_leaf_type).toEqual(expectedCardsDevrevLeafType);
  });

  it('should return an error when no events are provided', async () => {
    const result = await run([]);
    
    expect(result).toEqual({
      initial_domain_mapping: {},
      success: false,
      message: 'Get initial domain mapping failed: No events provided'
    });
  });

  it('should handle undefined events array', async () => {
    // @ts-ignore - Testing invalid input
    const result = await run(undefined);
    
    expect(result).toEqual({
      initial_domain_mapping: {},
      success: false,
      message: 'Get initial domain mapping failed: No events provided'
    });
  });

  it('should have both users and cards record type mappings', async () => {
    const result = await run([createMockEvent()]);
    const recordTypeMappings = result.initial_domain_mapping.additional_mappings.record_type_mappings;
    
    expect(Object.keys(recordTypeMappings)).toEqual(['users', 'cards']);
  });
});