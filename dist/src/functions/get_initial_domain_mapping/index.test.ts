import run from './index';
import initialDomainMapping from '../../core/initial-domain-mapping.json';
import {
  createMockEvent,
  setupConsoleSpies,
  clearAllMocks,
  createInvalidInputTestCases,
  createInvalidEventTestCases,
} from './test-setup';
import {
  validateSuccessResponseStructure,
  validateFailureResponseStructure,
  createMappingValidationScenarios,
  createErrorHandlingScenarios,
} from './test-helpers';

describe('get_initial_domain_mapping function', () => {
  beforeEach(() => {
    clearAllMocks();
    setupConsoleSpies();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return success response with initial domain mapping', async () => {
    const mockEvent = createMockEvent();
    const events = [mockEvent];

    const result = await run(events);

    validateSuccessResponseStructure(result);
  });

  describe('mapping validation scenarios', () => {
    const scenarios = createMappingValidationScenarios();

    Object.entries(scenarios).forEach(([key, scenario]) => {
      it(scenario.description, async () => {
        const mockEvent = createMockEvent();
        const events = [mockEvent];

        const result = await run(events);

        expect(result.status).toBe('success');
        scenario.validator(result.mapping);
      });
    });
  });

  describe('input validation', () => {
    const testCases = createInvalidInputTestCases();
    
    testCases.forEach(({ input, expectedMessage }) => {
      it(`should handle invalid input: ${JSON.stringify(input)}`, async () => {
        const result = await run(input as any);
        validateFailureResponseStructure(result, expectedMessage);
      });
    });
  });

  describe('event validation', () => {
    const testCases = createInvalidEventTestCases();
    
    testCases.forEach(({ name, eventModifier, expectedMessage }) => {
      it(`should handle ${name}`, async () => {
        const mockEvent = createMockEvent();
        const invalidEvent = eventModifier(mockEvent);
        const result = await run([invalidEvent as any]);
        validateFailureResponseStructure(result, expectedMessage);
      });
    });
  });

  describe('error handling', () => {
    const scenarios = createErrorHandlingScenarios();

    it(scenarios.validationError.description, async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      
      const result = await run([]);

      expect(consoleSpy).toHaveBeenCalledWith('Get initial domain mapping function error:', scenarios.validationError.expectedConsoleLog);
      validateFailureResponseStructure(result, scenarios.validationError.expectedMessage);
    });

    it(scenarios.unknownError.description, async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      
      // Create a mock that will cause an unknown error
      const mockEvent = createMockEvent();
      Object.defineProperty(mockEvent, 'context', {
        get: () => {
          throw 'string error'; // Non-Error object
        }
      });

      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, scenarios.unknownError.expectedMessage);
      expect(consoleSpy).toHaveBeenCalledWith('Get initial domain mapping function error:', scenarios.unknownError.expectedConsoleLog);
    });
  });

  it('should process only the first event when multiple events are provided', async () => {
    const mockEvent1 = createMockEvent();
    const mockEvent2 = createMockEvent();
    mockEvent2.context.dev_oid = 'different-dev-oid';

    const result = await run([mockEvent1, mockEvent2]);

    expect(result.status).toBe('success');
    expect(result.message).toBe('Successfully retrieved initial domain mapping');
    expect(result.mapping).toEqual(initialDomainMapping);
  });

  it('should return consistent mapping across multiple calls', async () => {
    const mockEvent = createMockEvent();
    const events = [mockEvent];

    const result1 = await run(events);
    const result2 = await run(events);

    expect(result1.mapping).toEqual(result2.mapping);
    expect(result1.status).toBe(result2.status);
    expect(result1.message).toBe(result2.message);
  });

  it('should validate that users mapping has correct default mapping to devu', async () => {
    const mockEvent = createMockEvent();
    const events = [mockEvent];

    const result = await run(events);

    expect(result.status).toBe('success');
    expect(result.mapping.additional_mappings.record_type_mappings.users.default_mapping).toEqual({
      object_category: 'stock',
      object_type: 'devu',
    });
  });

  it('should validate that field mappings use correct external fields', async () => {
    const mockEvent = createMockEvent();
    const events = [mockEvent];

    const result = await run(events);

    expect(result.status).toBe('success');
    const stockFieldMappings = result.mapping.additional_mappings.record_type_mappings.users.possible_record_type_mappings[0].shard.stock_field_mappings;
    
    expect(stockFieldMappings.full_name.primary_external_field).toBe('full_name');
    expect(stockFieldMappings.display_name.primary_external_field).toBe('username');
  });

  it('should validate that mapping is one-way (forward only)', async () => {
    const mockEvent = createMockEvent();
    const events = [mockEvent];

    const result = await run(events);

    expect(result.status).toBe('success');
    const possibleMapping = result.mapping.additional_mappings.record_type_mappings.users.possible_record_type_mappings[0];
    
    expect(possibleMapping.forward).toBe(true);
    expect(possibleMapping.reverse).toBe(false);
  });

  it('should validate that cards mapping has correct default mapping to issue', async () => {
    const mockEvent = createMockEvent();
    const events = [mockEvent];

    const result = await run(events);

    expect(result.status).toBe('success');
    expect(result.mapping.additional_mappings.record_type_mappings.cards.default_mapping).toEqual({
      object_category: 'stock',
      object_type: 'issue',
    });
  });

  it('should validate that cards field mappings use correct transformation methods', async () => {
    const mockEvent = createMockEvent();
    const events = [mockEvent];

    const result = await run(events);

    expect(result.status).toBe('success');
    const stockFieldMappings = result.mapping.additional_mappings.record_type_mappings.cards.possible_record_type_mappings[0].shard.stock_field_mappings;
    
    // Check external transformation methods
    expect(stockFieldMappings.title.primary_external_field).toBe('name');
    expect(stockFieldMappings.item_url_field.primary_external_field).toBe('url');
    expect(stockFieldMappings.body.primary_external_field).toBe('description');
    expect(stockFieldMappings.owned_by_ids.primary_external_field).toBe('id_members');
    expect(stockFieldMappings.created_by_id.primary_external_field).toBe('created_by');
  });
});