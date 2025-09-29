import { run } from './index';
import { spawn } from '@devrev/ts-adaas';
import { 
  createMockEvent, 
  expectedSpawnConfig, 
  testEventTypes, 
  supportedEventTypes 
} from './test-helpers';

// Mock the spawn function
jest.mock('@devrev/ts-adaas', () => ({
  ...jest.requireActual('@devrev/ts-adaas'),
  spawn: jest.fn().mockResolvedValue(undefined),
  EventType: {
    ExtractionExternalSyncUnitsStart: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
    ExtractionMetadataStart: 'EXTRACTION_METADATA_START',
    ExtractionDataStart: 'EXTRACTION_DATA_START',
    ExtractionDataContinue: 'EXTRACTION_DATA_CONTINUE',
    ExtractionAttachmentsStart: 'EXTRACTION_ATTACHMENTS_START',
    ExtractionAttachmentsContinue: 'EXTRACTION_ATTACHMENTS_CONTINUE',
  }
}));

describe('extraction function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  Object.entries(testEventTypes).forEach(([testName, { eventType, message }]) => {
    it(`should spawn a worker when given a valid ${eventType} event`, async () => {
      const mockEvent = createMockEvent(eventType);
      const result = await run([mockEvent]);
      
      expect(spawn).toHaveBeenCalledTimes(1);
      expect(spawn).toHaveBeenCalledWith(expectedSpawnConfig);
      expect(result).toEqual({
        success: true,
        message: message
      });
    });
  });

  it('should return an error when no events are provided', async () => {
    const result = await run([]);
    
    expect(spawn).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: 'Extraction failed: No events provided'
    });
  });

  it('should handle undefined events array', async () => {
    // @ts-ignore - Testing invalid input
    const result = await run(undefined);
    
    expect(spawn).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: 'Extraction failed: No events provided'
    });
  });

  it('should return an error for unexpected event type', async () => {
    const invalidEvent = createMockEvent('SOME_OTHER_EVENT_TYPE');
    
    const result = await run([invalidEvent]);
    
    expect(spawn).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: `Unexpected event type: SOME_OTHER_EVENT_TYPE. Expected: ${supportedEventTypes.join(' or ')}`
    });
  });
});