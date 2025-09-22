import { EventType, SyncMode } from '@devrev/ts-adaas';
import { run } from './index';
import { spawn } from '@devrev/ts-adaas';
import {
  createMockEvent,
  createMockEventWithOverrides,
  expectedSpawnParams,
  expectedSuccessResult,
  expectedNoEventsError
} from './test-helpers';

// Mock the spawn function
jest.mock('@devrev/ts-adaas', () => ({
  ...jest.requireActual('@devrev/ts-adaas'),
  spawn: jest.fn().mockResolvedValue(undefined),
  EventType: {
    ExtractionMetadataStart: 'EXTRACTION_METADATA_START',
    ExtractionExternalSyncUnitsStart: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
    ExtractionDataStart: 'EXTRACTION_DATA_START',
    ExtractionDataContinue: 'EXTRACTION_DATA_CONTINUE',
    ExtractionAttachmentsStart: 'EXTRACTION_ATTACHMENTS_START',
    ExtractionAttachmentsContinue: 'EXTRACTION_ATTACHMENTS_CONTINUE',
  },
  SyncMode: {
    INITIAL: 'INITIAL',
    INCREMENTAL: 'INCREMENTAL',
  }
}));

describe('extraction function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should spawn a worker when given a valid EXTRACTION_METADATA_START event', async () => {
    const mockEvent = createMockEvent('EXTRACTION_METADATA_START');
    const result = await run([mockEvent]);
    
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn).toHaveBeenCalledWith(expectedSpawnParams);
    expect(result).toEqual(expectedSuccessResult);
  });

  it('should spawn a worker when given a valid EXTRACTION_DATA_START event', async () => {
    const mockEvent = createMockEvent('EXTRACTION_DATA_START');
    const result = await run([mockEvent]);
    
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn).toHaveBeenCalledWith(expectedSpawnParams);
    expect(result).toEqual(expectedSuccessResult);
  });

  it('should spawn a worker when given a valid EXTRACTION_DATA_CONTINUE event', async () => {
    const mockEvent = createMockEvent('EXTRACTION_DATA_CONTINUE');
    const result = await run([mockEvent]);
    
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedSuccessResult);
  });

  it('should spawn a worker when given a valid EXTRACTION_EXTERNAL_SYNC_UNITS_START event', async () => {
    const mockEvent = createMockEvent(EventType.ExtractionExternalSyncUnitsStart);
    const result = await run([mockEvent]);
    
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedSuccessResult);
  });

  it('should spawn a worker when given a valid EXTRACTION_ATTACHMENTS_START event', async () => {
    const mockEvent = createMockEvent('EXTRACTION_ATTACHMENTS_START');
    const result = await run([mockEvent]);
    
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedSuccessResult);
  });

  it('should spawn a worker when given a valid EXTRACTION_ATTACHMENTS_CONTINUE event', async () => {
    const mockEvent = createMockEvent('EXTRACTION_ATTACHMENTS_CONTINUE');
    const result = await run([mockEvent]);
    
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedSuccessResult);
  });

  it('should spawn a worker for EXTRACTION_DATA_START with incremental mode', async () => {
    const mockEvent = createMockEventWithOverrides({
      payload: {
        event_type: 'EXTRACTION_DATA_START',
        event_context: {
          mode: 'INCREMENTAL'
        }
      }
    });
    
    const result = await run([mockEvent]);
    
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn).toHaveBeenCalledWith(expectedSpawnParams);
    expect(result).toEqual(expectedSuccessResult);
  });

  it('should return an error when no events are provided', async () => {
    const result = await run([]);
    
    expect(spawn).not.toHaveBeenCalled();
    expect(result).toEqual(expectedNoEventsError);
  });

  it('should handle undefined events array', async () => {
    // @ts-ignore - Testing invalid input
    const result = await run(undefined);
    
    expect(spawn).not.toHaveBeenCalled();
    expect(result).toEqual(expectedNoEventsError);
  });

  it('should return an error for unexpected event type', async () => {
    const invalidEvent = createMockEventWithOverrides({
      payload: {
        event_type: 'SOME_OTHER_EVENT_TYPE'
      }
    });
    
    const result = await run([invalidEvent]);
    
    expect(spawn).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false, 
      message: 'Unexpected event type: SOME_OTHER_EVENT_TYPE. Expected: EXTRACTION_EXTERNAL_SYNC_UNITS_START, EXTRACTION_METADATA_START, EXTRACTION_DATA_START, EXTRACTION_DATA_CONTINUE, EXTRACTION_ATTACHMENTS_START, or EXTRACTION_ATTACHMENTS_CONTINUE'
    });
  });
});