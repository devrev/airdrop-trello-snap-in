import { AirdropEvent, EventType, spawn } from '@devrev/ts-adaas';
import { handler } from './index';
import { loadInitialDomainMapping } from '../../core/domain-mapping-utils';
import { setupTest, createMockEvent } from './test-helpers';

describe('extraction_metadata function', () => {
  // Test utilities
  let testUtils: ReturnType<typeof setupTest>;
  
  beforeEach(() => {
    // Setup test environment before each test
    testUtils = setupTest();
  });
  
  afterEach(() => {
    // Clean up after each test
    testUtils.cleanup();
  });
  
  it('should return success when metadata extraction completes successfully', async () => {
    // Mock successful spawn execution
    (spawn as jest.MockedFunction<typeof spawn>).mockResolvedValueOnce(undefined);
    
    const mockEvent = createMockEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: true,
      message: 'Metadata extraction completed successfully'
    });

    // Verify spawn was called with the correct parameters
    expect(spawn).toHaveBeenCalledWith(expect.objectContaining({
      event: mockEvent,
      initialState: { completed: false },
      options: expect.objectContaining({
        timeout: 5 * 60 * 1000,
        batchSize: 100
      }),
      initialDomainMapping: {mock: "domain-mapping"}
    }));
  });

  it('should return false for non-metadata extraction event types', async () => {
    // Create a mock event with a different event type
    const mockEvent = createMockEvent(EventType.ExtractionDataStart);

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: `Event type ${EventType.ExtractionDataStart} is not a metadata extraction event`
    });

    // Verify spawn was not called
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should pass the initial domain mapping when spawning a worker', async () => {
    // Mock successful spawn execution
    (spawn as jest.MockedFunction<typeof spawn>).mockResolvedValueOnce(undefined);
    
    const mockEvent = createMockEvent();
    await handler([mockEvent]);
    
    // Verify loadInitialDomainMapping was called
    expect(loadInitialDomainMapping).toHaveBeenCalled();
  });

  it('should return false when service account token is missing', async () => {
    const mockEvent = createMockEvent();
    // Create a new context object without the service account token
    mockEvent.context = {
      ...mockEvent.context,
      secrets: {} as any
    };

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Missing service account token in event context'
    });

    // Verify spawn was not called
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should return false when DevRev endpoint is missing', async () => {
    const mockEvent = createMockEvent();
    // Create a new execution_metadata object without the devrev_endpoint
    mockEvent.execution_metadata = {} as any;
    
    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Missing DevRev endpoint in execution metadata'
    });

    // Verify spawn was not called
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should return false when event context is missing', async () => {
    const mockEvent = createMockEvent();
    // Create a new payload object without the event_context property
    mockEvent.payload = {
      connection_data: mockEvent.payload.connection_data,
      event_type: mockEvent.payload.event_type,
      // Intentionally omitting event_context to test the missing context case
    } as any;

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Missing event context in payload'
    });

    // Verify spawn was not called
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should return error details when spawn throws an error', async () => {
    // Mock spawn to throw an error
    const testError = new Error('Test spawn error');
    (spawn as jest.MockedFunction<typeof spawn>).mockRejectedValueOnce(testError);
    
    const mockEvent = createMockEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Error during metadata extraction: Test spawn error',
      details: testError
    });
  });

  it('should throw error when no events are provided', async () => {
    // Call the handler function with an empty array
    await expect(handler([])).rejects.toThrow('No events provided');
    
    // Verify spawn was not called
    expect(spawn).not.toHaveBeenCalled();
  });
});