import { data_extraction_check } from './index';
import { FunctionInput } from '../../core/types';
import { spawn } from '@devrev/ts-adaas';
import { EventType } from '@devrev/ts-adaas';
import { convertToAirdropEvent } from '../../core/utils';

// Mock the spawn function
jest.mock('@devrev/ts-adaas', () => ({
  spawn: jest.fn().mockResolvedValue(undefined),
  EventType: {
    ExtractionDataStart: 'EXTRACTION_DATA_START',
    ExtractionDataContinue: 'EXTRACTION_DATA_CONTINUE',
  },
  ExtractorEventType: {
    ExtractionDataDone: 'EXTRACTION_DATA_DONE',
    ExtractionDataProgress: 'EXTRACTION_DATA_PROGRESS',
    ExtractionDataError: 'EXTRACTION_DATA_ERROR',
  },
}));

// Mock the convertToAirdropEvent function
jest.mock('../../core/utils', () => ({
  convertToAirdropEvent: jest.fn().mockImplementation((input) => ({
    context: input.context,
    payload: {
      ...input.payload,
      event_type: input.payload.event_type || 'EXTRACTION_DATA_START',
    },
    execution_metadata: input.execution_metadata,
    input_data: input.input_data,
  })),
}));

describe('data_extraction_check function', () => {
  // Mock function input
  const mockFunctionInput: FunctionInput = {
    payload: {
      event_type: 'EXTRACTION_DATA_START',
      event_context: {},
      connection_data: {},
    },
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token'
      }
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: 'data_extraction_check',
      event_type: 'test-event-type',
      devrev_endpoint: 'https://api.devrev.ai/'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process the data extraction event', async () => {
    // Arrange
    const events = [mockFunctionInput];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await data_extraction_check(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Data extraction check completed successfully'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Data extraction check function invoked with request ID: test-request-id');
    expect(convertToAirdropEvent).toHaveBeenCalledWith(mockFunctionInput);
    expect(spawn).toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledWith(expect.objectContaining({
      initialState: { users: { completed: false } }
    }));
  });

  it('should throw an error when no events are provided', async () => {
    // Arrange
    const events: FunctionInput[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act & Assert
    await expect(data_extraction_check(events)).rejects.toThrow('No events provided to the function');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should handle non-data extraction events gracefully', async () => {
    // Arrange
    const nonExtractionEvent = {
      ...mockFunctionInput,
      payload: {
        ...mockFunctionInput.payload,
        event_type: 'SOME_OTHER_EVENT_TYPE',
      },
    };
    
    // Mock the convertToAirdropEvent to return the different event type
    (convertToAirdropEvent as jest.Mock).mockImplementationOnce((input) => ({
      context: input.context,
      payload: {
        ...input.payload,
        event_type: 'SOME_OTHER_EVENT_TYPE',
      },
      execution_metadata: input.execution_metadata,
      input_data: input.input_data,
    }));
    
    const events = [nonExtractionEvent];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await data_extraction_check(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Function executed, but the event type was not EXTRACTION_DATA_START or EXTRACTION_DATA_CONTINUE'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Received event type: SOME_OTHER_EVENT_TYPE, expected: EXTRACTION_DATA_START or EXTRACTION_DATA_CONTINUE');
    expect(spawn).not.toHaveBeenCalled();
  });

  it('should handle data continue events', async () => {
    // Arrange
    const continueEvent = {
      ...mockFunctionInput,
      payload: {
        ...mockFunctionInput.payload,
        event_type: 'EXTRACTION_DATA_CONTINUE',
      },
    };
    
    // Mock the convertToAirdropEvent to return the continue event type
    (convertToAirdropEvent as jest.Mock).mockImplementationOnce((input) => ({
      context: input.context,
      payload: {
        ...input.payload,
        event_type: 'EXTRACTION_DATA_CONTINUE',
      },
      execution_metadata: input.execution_metadata,
      input_data: input.input_data,
    }));
    
    const events = [continueEvent];

    // Act
    const result = await data_extraction_check(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Data extraction check completed successfully'
    });
    expect(spawn).toHaveBeenCalled();
  });
});