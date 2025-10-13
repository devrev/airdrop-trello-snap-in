import { FunctionInput, Context, ExecutionMetadata, InputData } from '../../core/types';
import run from './index';

describe('health-check function', () => {
  const createMockContext = (): Context => ({
    dev_oid: 'test-dev-oid',
    source_id: 'test-source-id',
    snap_in_id: 'test-snap-in-id',
    snap_in_version_id: 'test-snap-in-version-id',
    service_account_id: 'test-service-account-id',
    secrets: {
      service_account_token: 'test-token',
    },
  });

  const createMockExecutionMetadata = (): ExecutionMetadata => ({
    request_id: 'test-request-id',
    function_name: 'health-check',
    event_type: 'test-event',
    devrev_endpoint: 'https://api.devrev.ai/',
  });

  const createMockInputData = (): InputData => ({
    global_values: {},
    event_sources: {},
  });

  const createMockEvent = (): FunctionInput => ({
    payload: { test: 'data' },
    context: createMockContext(),
    execution_metadata: createMockExecutionMetadata(),
    input_data: createMockInputData(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return success response for valid input', async () => {
    const mockEvent = createMockEvent();
    const events = [mockEvent];

    const result = await run(events);

    expect(result).toEqual({
      status: 'success',
      message: 'Function can be invoked successfully',
      timestamp: expect.any(String),
    });
    expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  });

  it('should throw error when events is not an array', async () => {
    await expect(run(null as any)).rejects.toThrow('Invalid input: events must be an array');
    await expect(run(undefined as any)).rejects.toThrow('Invalid input: events must be an array');
    await expect(run('not-array' as any)).rejects.toThrow('Invalid input: events must be an array');
  });

  it('should throw error when events array is empty', async () => {
    await expect(run([])).rejects.toThrow('Invalid input: events array cannot be empty');
  });

  it('should throw error when event is null or undefined', async () => {
    await expect(run([null as any])).rejects.toThrow('Invalid event: event cannot be null or undefined');
    await expect(run([undefined as any])).rejects.toThrow('Invalid event: event cannot be null or undefined');
  });

  it('should throw error when event is missing context', async () => {
    const mockEvent = createMockEvent();
    const eventWithoutContext = {
      ...mockEvent,
      context: undefined,
    } as any;

    await expect(run([eventWithoutContext])).rejects.toThrow('Invalid event: missing context');
  });

  it('should throw error when event is missing execution_metadata', async () => {
    const mockEvent = createMockEvent();
    const eventWithoutExecutionMetadata = {
      ...mockEvent,
      execution_metadata: undefined,
    } as any;

    await expect(run([eventWithoutExecutionMetadata])).rejects.toThrow('Invalid event: missing execution_metadata');
  });

  it('should throw error when event is missing payload', async () => {
    const mockEvent = createMockEvent();
    const eventWithoutPayload = {
      ...mockEvent,
      payload: undefined,
    } as any;

    await expect(run([eventWithoutPayload])).rejects.toThrow('Invalid event: missing payload');
  });

  it('should throw error when context is missing dev_oid', async () => {
    const mockEvent = createMockEvent();
    const { dev_oid, ...contextWithoutDevOid } = mockEvent.context;
    const eventWithIncompleteContext = {
      ...mockEvent,
      context: contextWithoutDevOid,
    } as any;

    await expect(run([eventWithIncompleteContext])).rejects.toThrow('Invalid event: missing dev_oid in context');
  });

  it('should throw error when context is missing snap_in_id', async () => {
    const mockEvent = createMockEvent();
    const { snap_in_id, ...contextWithoutSnapInId } = mockEvent.context;
    const eventWithIncompleteContext = {
      ...mockEvent,
      context: contextWithoutSnapInId,
    } as any;

    await expect(run([eventWithIncompleteContext])).rejects.toThrow('Invalid event: missing snap_in_id in context');
  });

  it('should throw error when execution_metadata is missing request_id', async () => {
    const mockEvent = createMockEvent();
    const { request_id, ...executionMetadataWithoutRequestId } = mockEvent.execution_metadata;
    const eventWithIncompleteExecutionMetadata = {
      ...mockEvent,
      execution_metadata: executionMetadataWithoutRequestId,
    } as any;

    await expect(run([eventWithIncompleteExecutionMetadata])).rejects.toThrow('Invalid event: missing request_id in execution_metadata');
  });

  it('should throw error when execution_metadata is missing function_name', async () => {
    const mockEvent = createMockEvent();
    const { function_name, ...executionMetadataWithoutFunctionName } = mockEvent.execution_metadata;
    const eventWithIncompleteExecutionMetadata = {
      ...mockEvent,
      execution_metadata: executionMetadataWithoutFunctionName,
    } as any;

    await expect(run([eventWithIncompleteExecutionMetadata])).rejects.toThrow('Invalid event: missing function_name in execution_metadata');
  });

  it('should log error details when validation fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    try {
      await run([]);
    } catch (error) {
      // Expected to throw
    }

    expect(consoleSpy).toHaveBeenCalledWith('Health check function error:', {
      error_message: 'Invalid input: events array cannot be empty',
      error_stack: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('should process only the first event when multiple events are provided', async () => {
    const mockEvent1 = createMockEvent();
    const mockEvent2 = createMockEvent();
    mockEvent2.context.dev_oid = 'different-dev-oid';

    const result = await run([mockEvent1, mockEvent2]);

    expect(result).toEqual({
      status: 'success',
      message: 'Function can be invoked successfully',
      timestamp: expect.any(String),
    });
  });

  it('should handle unknown errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    // Create a mock that will cause an unknown error
    const mockEvent = createMockEvent();
    // Override context getter to throw an unknown error
    Object.defineProperty(mockEvent, 'context', {
      get: () => {
        throw 'string error'; // Non-Error object
      }
    });

    try {
      await run([mockEvent]);
    } catch (error) {
      // Expected to throw
    }

    expect(consoleSpy).toHaveBeenCalledWith('Health check function error:', {
      error_message: 'Unknown error',
      error_stack: undefined,
      timestamp: expect.any(String),
    });
  });
});