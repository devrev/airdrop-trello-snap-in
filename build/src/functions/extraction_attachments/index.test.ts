import { AirdropEvent, EventType, spawn } from '@devrev/ts-adaas';
import { handler } from './index';
import { loadInitialDomainMapping } from '../../core/domain-mapping-utils';
import { setupTest, createMockEvent } from './test-helpers';

describe('extraction_attachments function', () => {
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
  
  it('should return success when attachments extraction completes successfully', async () => {
    // Mock successful spawn execution
    (spawn as jest.MockedFunction<typeof spawn>).mockResolvedValueOnce(undefined);
    
    const mockEvent = createMockEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: true,
      message: 'Attachments extraction completed successfully'
    });

    // Verify spawn was called with the correct parameters
    expect(spawn).toHaveBeenCalledWith(expect.objectContaining({
      event: mockEvent,
      initialState: { completed: false },
      options: expect.objectContaining({
        timeout: 10 * 60 * 1000,
        batchSize: 50
      }),
      initialDomainMapping: {mock: "domain-mapping"}
    }));
  });

  it('should handle ExtractionAttachmentsContinue event type', async () => {
    // Mock successful spawn execution
    (spawn as jest.MockedFunction<typeof spawn>).mockResolvedValueOnce(undefined);
    
    const mockEvent = createMockEvent(EventType.ExtractionAttachmentsContinue);

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: true,
      message: 'Attachments extraction completed successfully'
    });
  });

  it('should return false for non-attachments extraction event types', async () => {
    // Create a mock event with a different event type
    const mockEvent = createMockEvent(EventType.ExtractionMetadataStart);

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: `Event type ${EventType.ExtractionMetadataStart} is not an attachments extraction event`
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

  it('should return false when connection data is missing', async () => {
    const mockEvent = createMockEvent();
    // Remove connection data from the payload
    mockEvent.payload.connection_data = undefined as any;

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Missing connection data in payload'
    });

    // Verify spawn was not called
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should return false when key is missing in connection data', async () => {
    const mockEvent = createMockEvent();
    // Create a new connection data object without the key property
    const { key, ...connectionDataWithoutKey } = mockEvent.payload.connection_data;
    
    // Replace the original connection data with the new one that doesn't have key
    mockEvent.payload.connection_data = ({
      ...connectionDataWithoutKey
    } as any);

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Missing key in connection data'
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
      message: 'Error during attachments extraction: Test spawn error',
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