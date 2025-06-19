// Mock setup must come before imports
jest.mock('@devrev/ts-adaas', () => {
  const original = jest.requireActual('@devrev/ts-adaas');
  const mockedSpawn = jest.fn().mockResolvedValue(undefined);
  return {
    ...original,
    spawn: mockedSpawn,
  };
});
  
import { AirdropEvent, EventType } from '@devrev/ts-adaas';
import { handler as extractionHandler } from './index';

import * as pushBoardsAsSyncUnitsModule from '../push_boards_as_sync_units';
import * as extractionMetadataModule from '../extraction_metadata';
import * as extractionUsersModule from '../extraction_users';
import * as extractionCardsModule from '../extraction_cards';
import * as extractionAttachmentsModule from '../extraction_attachments';
// Get reference to the mocked spawn function
const mockedSpawn = jest.mocked(require('@devrev/ts-adaas').spawn);

// Create spies on the imported handlers
const pushBoardsAsSyncUnitsSpy = jest.spyOn(pushBoardsAsSyncUnitsModule, 'handler');
const extractionMetadataSpy = jest.spyOn(extractionMetadataModule, 'handler');
const extractionUsersSpy = jest.spyOn(extractionUsersModule, 'handler');
const extractionCardsSpy = jest.spyOn(extractionCardsModule, 'handler');
const extractionAttachmentsSpy = jest.spyOn(extractionAttachmentsModule, 'handler');

describe('extraction function', () => {
  // Create a properly structured mock AirdropEvent
  const createMockEvent = (eventType: EventType): AirdropEvent => ({
    context: {
      secrets: {
        service_account_token: 'mock-token',
      },
      snap_in_version_id: 'mock-version-id',
      snap_in_id: 'mock-snap-in-id',
    } as any,
    execution_metadata: {
      devrev_endpoint: 'https://mock-endpoint.devrev.ai'
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
    payload: {
      connection_data: {
        org_id: 'mock-org-id',
        org_name: 'mock-org-name',
        key: 'mock-key',
        key_type: 'mock-key-type',
      },
      event_context: {
        callback_url: 'https://mock-callback-url',
        dev_org: 'mock-dev-org',
        dev_org_id: 'mock-dev-org-id',
        dev_user: 'mock-dev-user',
        dev_user_id: 'mock-dev-user-id',
        external_sync_unit: 'mock-external-sync-unit',
        external_sync_unit_id: 'mock-external-sync-unit-id',
        external_sync_unit_name: 'mock-external-sync-unit-name',
        external_system: 'mock-external-system',
        external_system_type: 'mock-external-system-type',
        import_slug: 'mock-import-slug',
        mode: 'INITIAL',
        request_id: 'mock-request-id',
        snap_in_slug: 'mock-snap-in-slug',
        snap_in_version_id: 'mock-snap-in-version-id',
        uuid: 'mock-uuid',
        worker_data_url: 'mock-worker-data-url',
      },
      event_type: eventType,
    } as any,
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();

    // Set up default mock implementations
    pushBoardsAsSyncUnitsSpy.mockResolvedValue({
      success: true,
      message: 'Successfully pushed boards as external sync units'
    });

    extractionMetadataSpy.mockResolvedValue({
      success: true,
      message: 'Metadata extraction completed successfully'
    });

    extractionUsersSpy.mockResolvedValue({
      success: true,
      message: 'Users extraction completed successfully'
    });

    extractionCardsSpy.mockResolvedValue({
      success: true,
      message: 'Cards extraction completed successfully'
    });

    extractionAttachmentsSpy.mockResolvedValue({ 
      success: true, 
      message: 'Attachments extraction completed successfully'
    });
    mockedSpawn.mockClear();
  });

  it('should call pushBoardsAsSyncUnits for ExtractionExternalSyncUnitsStart event', async () => {
    const mockEvent = createMockEvent(EventType.ExtractionExternalSyncUnitsStart);

    const result = await extractionHandler([mockEvent]);

    expect(pushBoardsAsSyncUnitsSpy).toHaveBeenCalledWith([mockEvent]);
    expect(result).toEqual({
      success: true,
      message: 'Successfully pushed boards as external sync units'
    });
  });

  it('should call extractionMetadata for ExtractionMetadataStart event', async () => {
    const mockEvent = createMockEvent(EventType.ExtractionMetadataStart);

    const result = await extractionHandler([mockEvent]);

    expect(extractionMetadataSpy).toHaveBeenCalledWith([mockEvent]);
    expect(result).toEqual({
      success: true,
      message: 'Metadata extraction completed successfully'
    });
  });

  it('should spawn a worker for ExtractionDataStart event', async () => {
    const mockEvent = createMockEvent(EventType.ExtractionDataStart);
    
    // Mock successful spawn execution
    mockedSpawn.mockResolvedValue(undefined);

    const result = await extractionHandler([mockEvent]);

    // Verify spawn was called with the correct parameters
    expect(mockedSpawn).toHaveBeenCalledWith(expect.objectContaining({
      event: mockEvent,
      initialState: expect.objectContaining({
        users: { completed: false },
        cards: { completed: false }
      }),
      options: expect.any(Object),
      initialDomainMapping: expect.any(Object)
    }));
    
    expect(result).toEqual({
      success: true,
      message: 'Data extraction completed successfully'
    });
  });
  
  it('should handle errors from extraction functions', async () => {
    const mockEvent = createMockEvent(EventType.ExtractionExternalSyncUnitsStart);
    
    // Mock pushBoardsAsSyncUnits to return a failure response
    pushBoardsAsSyncUnitsSpy.mockResolvedValue({
      success: false,
      message: 'Users extraction failed'
    });
    
    const result = await extractionHandler([mockEvent]);
    
    expect(pushBoardsAsSyncUnitsSpy).toHaveBeenCalledWith([mockEvent]);
    expect(result).toEqual({
      success: false,
      message: 'Users extraction failed'
    });
  });

  it('should call extractionAttachments for ExtractionAttachmentsStart event', async () => {
    const mockEvent = createMockEvent(EventType.ExtractionAttachmentsStart);

    const result = await extractionHandler([mockEvent]);

    expect(extractionAttachmentsSpy).toHaveBeenCalledWith([mockEvent]);
    expect(result).toEqual({
      success: true,
      message: 'Attachments extraction completed successfully'
    });
  });

  it('should call extractionAttachments for ExtractionAttachmentsContinue event', async () => {
    const mockEvent = createMockEvent(EventType.ExtractionAttachmentsContinue);

    const result = await extractionHandler([mockEvent]);

    expect(extractionAttachmentsSpy).toHaveBeenCalledWith([mockEvent]);
    expect(result).toEqual({
      success: true,
      message: 'Attachments extraction completed successfully'
    });
  });

  it('should return error for unsupported event types', async () => {
    const mockEvent = createMockEvent(EventType.ExtractionDataDelete as any);

    const result = await extractionHandler([mockEvent]);

    expect(result).toEqual({
      success: false,
      message: `Unsupported event type: ${EventType.ExtractionDataDelete}`
    });
  });

  it('should throw error when no events are provided', async () => {
    // Call the handler function with an empty array
    const result = await extractionHandler([]);

    // Verify the result is a structured error response instead of throwing
    expect(result).toEqual({
      success: false,
      message: 'Error in extraction function: No events provided',
      details: new Error('No events provided')
    });
  });

  it('should handle errors from extraction functions', async () => {
    const mockEvent = createMockEvent(EventType.ExtractionExternalSyncUnitsStart);

    // Mock pushBoardsAsSyncUnits to throw an error
    pushBoardsAsSyncUnitsSpy.mockRejectedValue(new Error('Test error'));

    const result = await extractionHandler([mockEvent]);

    expect(result).toEqual({ success: false, message: 'Error in extraction function: Test error', details: new Error('Test error') });
  });
  
  it('should handle errors when spawn throws an error', async () => {
    const mockEvent = createMockEvent(EventType.ExtractionDataStart);
    
    // Mock spawn to throw an error
    const testError = new Error('Test spawn error');
    mockedSpawn.mockRejectedValueOnce(testError);
    
    const result = await extractionHandler([mockEvent]);
    
    expect(result).toEqual({
      success: false,
      message: 'Error during data extraction: Test spawn error',
      details: testError
    });
  });
});