import run from './index';
import externalDomainMetadata from '../../core/external-domain-metadata.json';
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
  createMetadataValidationScenarios,
  createErrorHandlingScenarios,
} from './test-helpers';

describe('get_external_domain_metadata function', () => {
  beforeEach(() => {
    clearAllMocks();
    setupConsoleSpies();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return success response with external domain metadata', async () => {
    const mockEvent = createMockEvent();
    const events = [mockEvent];

    const result = await run(events);

    validateSuccessResponseStructure(result);
  });

  describe('metadata validation scenarios', () => {
    const scenarios = createMetadataValidationScenarios();

    Object.entries(scenarios).forEach(([key, scenario]) => {
      it(scenario.description, async () => {
        const mockEvent = createMockEvent();
        const events = [mockEvent];

        const result = await run(events);

        expect(result.status).toBe('success');
        scenario.validator(result.metadata);
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

      expect(consoleSpy).toHaveBeenCalledWith('Get external domain metadata function error:', scenarios.validationError.expectedConsoleLog);
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
      expect(consoleSpy).toHaveBeenCalledWith('Get external domain metadata function error:', scenarios.unknownError.expectedConsoleLog);
    });
  });

  it('should process only the first event when multiple events are provided', async () => {
    const mockEvent1 = createMockEvent();
    const mockEvent2 = createMockEvent();
    mockEvent2.context.dev_oid = 'different-dev-oid';

    const result = await run([mockEvent1, mockEvent2]);

    expect(result.status).toBe('success');
    expect(result.message).toBe('Successfully retrieved external domain metadata');
    expect(result.metadata).toEqual(externalDomainMetadata);
  });

  it('should return consistent metadata across multiple calls', async () => {
    const mockEvent = createMockEvent();
    const events = [mockEvent];

    const result1 = await run(events);
    const result2 = await run(events);

    expect(result1.metadata).toEqual(result2.metadata);
    expect(result1.status).toBe(result2.status);
    expect(result1.message).toBe(result2.message);
  });
});