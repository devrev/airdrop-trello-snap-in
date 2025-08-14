import { extraction } from './index';
import { FunctionInput } from '../../core/types';
import { spawn } from '@devrev/ts-adaas';
import { EventType } from '@devrev/ts-adaas';
import { convertToAirdropEvent } from '../../core/utils';
import * as fs from 'fs';
import { TrelloClient } from '../../core/trello_client';
import * as path from 'path';

// Mock the spawn function
jest.mock('@devrev/ts-adaas', () => ({
  spawn: jest.fn().mockResolvedValue(undefined),
  processTask: jest.fn(),
  NormalizedItem: {},
  RepoInterface: {},
  ExtractorState: {},
  ExternalSyncUnit: {},
  EventType: {
    ExtractionExternalSyncUnitsStart: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
    ExtractionMetadataStart: 'EXTRACTION_METADATA_START',
    ExtractionDataStart: 'EXTRACTION_DATA_START',
    ExtractionDataContinue: 'EXTRACTION_DATA_CONTINUE',
    ExtractionAttachmentsStart: 'EXTRACTION_ATTACHMENTS_START',
    ExtractionAttachmentsContinue: 'EXTRACTION_ATTACHMENTS_CONTINUE',
  },
  ExtractorEventType: {
    ExtractionExternalSyncUnitsDone: 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE',
    ExtractionExternalSyncUnitsError: 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR',
  },
}));

// Mock the TrelloClient
jest.mock('../../core/trello_client');


// Mock the normalizers
jest.mock('./normalizers', () => ({
  normalizeUser: jest.fn(),
  normalizeCard: jest.fn(),
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

// Mock fs and path
jest.mock('fs');
jest.mock('path');

describe('extraction function', () => {
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
      function_name: 'extraction',
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
    
    // Mock path.resolve to return a fixed path
    (path.resolve as jest.Mock).mockReturnValue('/mock/path/to/initial_domain_mapping.json');
    
    // Mock fs.readFileSync to return mock mapping
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({mock: "mapping"}));
    
    // Mock TrelloClient methods
    (TrelloClient as jest.Mock).mockImplementation(() => ({
      getBoards: jest.fn().mockResolvedValue([])
    }));
  });

  it('should process the external sync units extraction event', async () => {
    // Arrange
    const events = [mockFunctionInput];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await extraction(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'External sync units extraction completed successfully'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Extraction function invoked with request ID: test-request-id');
    expect(consoleSpy).toHaveBeenCalledWith('Processing external sync units extraction event');
    expect(convertToAirdropEvent).toHaveBeenCalledWith(mockFunctionInput);
    expect(spawn).toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledWith(expect.objectContaining({
      initialState: {},
      initialDomainMapping: {mock: "mapping"},
    }));
  });

  it('should throw an error when no events are provided', async () => {
    // Arrange
    const events: FunctionInput[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act & Assert
    await expect(extraction(events)).rejects.toThrow('No events provided to the function');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should handle unsupported event types gracefully', async () => {
    // Arrange
    const unsupportedEvent = {
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
    
    const events = [unsupportedEvent];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await extraction(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Function executed, but the event type SOME_OTHER_EVENT_TYPE is not supported yet'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Received unsupported event type: SOME_OTHER_EVENT_TYPE');
    expect(spawn).not.toHaveBeenCalled();
  });
  
  it('should process the metadata extraction event', async () => {
    // Arrange
    const metadataEvent = {
      ...mockFunctionInput,
      payload: {
        ...mockFunctionInput.payload,
        event_type: 'EXTRACTION_METADATA_START',
      },
    };
    
    // Mock the convertToAirdropEvent to return the metadata event type
    (convertToAirdropEvent as jest.Mock).mockImplementationOnce((input) => ({
      context: input.context,
      payload: {
        ...input.payload,
        event_type: 'EXTRACTION_METADATA_START',
      },
      execution_metadata: input.execution_metadata,
      input_data: input.input_data,
    }));
    
    const events = [metadataEvent];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await extraction(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Metadata extraction completed successfully'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Extraction function invoked with request ID: test-request-id');
    expect(consoleSpy).toHaveBeenCalledWith('Processing metadata extraction event');
    expect(convertToAirdropEvent).toHaveBeenCalledWith(metadataEvent);
    expect(spawn).toHaveBeenCalled();
  });
  
  it('should process the data extraction start event', async () => {
    // Arrange
    const dataEvent = {
      ...mockFunctionInput,
      payload: {
        ...mockFunctionInput.payload,
        event_type: 'EXTRACTION_DATA_START',
      },
    };
    
    // Mock the convertToAirdropEvent to return the data event type
    (convertToAirdropEvent as jest.Mock).mockImplementationOnce((input) => ({
      context: input.context,
      payload: {
        ...input.payload,
        event_type: 'EXTRACTION_DATA_START',
      },
      execution_metadata: input.execution_metadata,
      input_data: input.input_data,
    }));
    
    const events = [dataEvent];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await extraction(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Data extraction completed successfully'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Extraction function invoked with request ID: test-request-id');
    expect(consoleSpy).toHaveBeenCalledWith('Processing data extraction event');
    expect(convertToAirdropEvent).toHaveBeenCalledWith(dataEvent);
    expect(spawn).toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledWith(expect.objectContaining({
      initialState: {
        users: { completed: false },
        cards: { completed: false },
        attachments: { completed: false }
      }
    }));
  });
  
  it('should process the data extraction continue event', async () => {
    // Arrange
    const dataContinueEvent = {
      ...mockFunctionInput,
      payload: {
        ...mockFunctionInput.payload,
        event_type: 'EXTRACTION_DATA_CONTINUE',
      },
    };
    
    // Mock the convertToAirdropEvent to return the data continue event type
    (convertToAirdropEvent as jest.Mock).mockImplementationOnce((input) => ({
      context: input.context,
      payload: {
        ...input.payload,
        event_type: 'EXTRACTION_DATA_CONTINUE',
      },
      execution_metadata: input.execution_metadata,
      input_data: input.input_data,
    }));
    
    const events = [dataContinueEvent];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await extraction(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Data extraction completed successfully'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Extraction function invoked with request ID: test-request-id');
    expect(consoleSpy).toHaveBeenCalledWith('Processing data extraction event');
    expect(convertToAirdropEvent).toHaveBeenCalledWith(dataContinueEvent);
    expect(spawn).toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledWith(expect.objectContaining({
      initialState: {
        users: { completed: false },
        cards: { completed: false },
        attachments: { completed: false }
      }
    }));
  });
  
  it('should process the attachments extraction start event', async () => {
    // Arrange
    const attachmentsEvent = {
      ...mockFunctionInput,
      payload: {
        ...mockFunctionInput.payload,
        event_type: 'EXTRACTION_ATTACHMENTS_START',
      },
    };
    
    // Mock the convertToAirdropEvent to return the attachments event type
    (convertToAirdropEvent as jest.Mock).mockImplementationOnce((input) => ({
      context: input.context,
      payload: {
        ...input.payload,
        event_type: 'EXTRACTION_ATTACHMENTS_START',
      },
      execution_metadata: input.execution_metadata,
      input_data: input.input_data,
    }));
    
    const events = [attachmentsEvent];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await extraction(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Attachments extraction completed successfully'
    });
    expect(consoleSpy).toHaveBeenCalledWith('Extraction function invoked with request ID: test-request-id');
    expect(consoleSpy).toHaveBeenCalledWith('Processing attachments extraction event');
    expect(convertToAirdropEvent).toHaveBeenCalledWith(attachmentsEvent);
    expect(spawn).toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledWith(expect.objectContaining({
      initialState: expect.objectContaining({ attachments: { completed: false } })
    }));
  });
});