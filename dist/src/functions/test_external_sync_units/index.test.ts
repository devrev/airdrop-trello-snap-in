import { test_external_sync_units } from './index';
import { FunctionInput } from '../../core/types';
import { spawn } from '@devrev/ts-adaas';
import { EventType } from '@devrev/ts-adaas';
import { convertToAirdropEvent } from '../../core/utils';

// Mock the spawn function
jest.mock('@devrev/ts-adaas', () => ({
  spawn: jest.fn().mockResolvedValue(undefined),
  EventType: {
    ExtractionExternalSyncUnitsStart: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
  },
  ExtractorEventType: {
    ExtractionExternalSyncUnitsDone: 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE',
    ExtractionExternalSyncUnitsError: 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR',
  },
}));

// Mock the convertToAirdropEvent function
jest.mock('../../core/utils', () => ({
  convertToAirdropEvent: jest.fn().mockImplementation((input) => ({
    context: input.context,
    payload: {
      ...input.payload,
      event_type: input.payload.event_type || 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
    },
    execution_metadata: input.execution_metadata,
    input_data: input.input_data,
  })),
}));

describe('test_external_sync_units function', () => {
  // Mock function input
  const mockFunctionInput: FunctionInput = {
    payload: {
      event_type: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
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
      function_name: 'test_external_sync_units',
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

  it('should process the external sync units extraction event', async () => {
    // Arrange
    const events = [mockFunctionInput];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await test_external_sync_units(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'External sync units extraction test completed successfully'
    });
    expect(consoleSpy).toHaveBeenCalledWith('External sync units test function invoked with request ID: test-request-id');
    expect(convertToAirdropEvent).toHaveBeenCalledWith(mockFunctionInput);
    expect(spawn).toHaveBeenCalled();
  });

  it('should throw an error when no events are provided', async () => {
    // Arrange
    const events: FunctionInput[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act & Assert
    await expect(test_external_sync_units(events)).rejects.toThrow('No events provided to the function');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should handle non-external sync units events gracefully', async () => {
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
    const result = await test_external_sync_units(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Function executed, but the event type was not EXTRACTION_EXTERNAL_SYNC_UNITS_START'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Received event type: SOME_OTHER_EVENT_TYPE, expected: EXTRACTION_EXTERNAL_SYNC_UNITS_START');
    expect(spawn).not.toHaveBeenCalled();
  });
});