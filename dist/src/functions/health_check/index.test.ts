import run from './index';
import { FunctionInput } from '../../core/types';

describe('health_check function', () => {
  const createMockEvent = (overrides?: Partial<FunctionInput>): FunctionInput => ({
    payload: {},
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token',
      },
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: 'health_check',
      event_type: 'test-event',
      devrev_endpoint: 'https://api.devrev.ai/',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
    ...overrides,
  });

  it('should return success for valid event', async () => {
    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result).toEqual({
      success: true,
      message: 'Health check passed',
      function_name: 'health_check',
      request_id: 'test-request-id',
    });
  });

  it('should handle empty events array', async () => {
    const result = await run([]);

    expect(result).toEqual({
      success: true,
      message: 'Health check passed - no events to process',
    });
  });

  it('should process only the first event when multiple events provided', async () => {
    const mockEvent1 = createMockEvent({
      execution_metadata: {
        request_id: 'first-request-id',
        function_name: 'health_check',
        event_type: 'test-event',
        devrev_endpoint: 'https://api.devrev.ai/',
      },
    });
    const mockEvent2 = createMockEvent({
      execution_metadata: {
        request_id: 'second-request-id',
        function_name: 'health_check',
        event_type: 'test-event',
        devrev_endpoint: 'https://api.devrev.ai/',
      },
    });

    const result = await run([mockEvent1, mockEvent2]);

    expect(result).toEqual({
      success: true,
      message: 'Health check passed',
      function_name: 'health_check',
      request_id: 'first-request-id',
    });
  });

  it('should throw error for invalid event structure', async () => {
    const invalidEvent = {
      payload: {},
      context: {},
    } as FunctionInput;

    await expect(run([invalidEvent])).rejects.toThrow(
      'Invalid event structure: missing execution_metadata'
    );
  });

  it('should throw error for null event', async () => {
    await expect(run([null as any])).rejects.toThrow(
      'Invalid event structure: missing execution_metadata'
    );
  });
});