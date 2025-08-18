import { 
  handleAttachmentsExtraction, 
  getAttachmentStream 
} from './attachment-handlers';
import { 
  ExtractorEventType, 
  ExternalSystemAttachmentStreamingParams,
  axios, 
  EventType,
  AirdropEvent, 
  axiosClient
} from '@devrev/ts-adaas';

// Mock the axios client
jest.mock('@devrev/ts-adaas', () => {
  const originalModule = jest.requireActual('@devrev/ts-adaas');
  return {
    ...originalModule,
    axios: {
      isAxiosError: jest.fn().mockReturnValue(true)
    },
    axiosClient: {
      get: jest.fn()
    },
    serializeAxiosError: jest.fn().mockReturnValue('serialized error')
  };
});

describe('Attachment extraction handlers', () => {
  // Mock adapter
  const mockAdapter = {
    state: {
      attachments: { completed: false }
    },
    emit: jest.fn().mockResolvedValue(undefined),
    streamAttachments: jest.fn(),
    postState: jest.fn().mockResolvedValue(undefined),
    event: {
      payload: {
        event_type: 'EXTRACTION_ATTACHMENTS_START'
      },
      context: { 
        snap_in_id: 'test-snap-in-id',
        secrets: { service_account_token: 'test-token' }
      },
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdapter.streamAttachments.mockReset();
  });

  describe('handleAttachmentsExtraction', () => {
    it('should emit done event when attachments are already completed', async () => {
      // Arrange
      const adapterWithCompletedAttachments = {
        ...mockAdapter,
        state: { 
          attachments: { completed: true }
        }
      };
      
      // Act
      await handleAttachmentsExtraction(adapterWithCompletedAttachments);
      
      // Assert
      expect(adapterWithCompletedAttachments.emit).toHaveBeenCalledWith(
        ExtractorEventType.ExtractionAttachmentsDone
      );
      expect(adapterWithCompletedAttachments.streamAttachments).not.toHaveBeenCalled();
    });

    it('should handle successful attachment streaming', async () => {
      // Arrange
      mockAdapter.streamAttachments.mockResolvedValue(undefined);
      mockAdapter.state.attachments = { completed: false };
      
      // Act
      await handleAttachmentsExtraction(mockAdapter);
      
      // Assert
      expect(mockAdapter.streamAttachments).toHaveBeenCalledWith({
        stream: expect.any(Function)
      });
      expect(mockAdapter.emit).toHaveBeenCalledWith(
        ExtractorEventType.ExtractionAttachmentsDone
      );
      expect(mockAdapter.state.attachments.completed).toBe(true);
    });

    it('should handle delay in attachment streaming', async () => {
      // Arrange
      mockAdapter.streamAttachments.mockResolvedValue({ delay: 30 });
      mockAdapter.state.attachments = { completed: false };
      
      // Act
      await handleAttachmentsExtraction(mockAdapter);
      
      // Assert
      expect(mockAdapter.streamAttachments).toHaveBeenCalled();
      expect(mockAdapter.emit).toHaveBeenCalledWith(
        ExtractorEventType.ExtractionAttachmentsDelay,
        { delay: 30 }
      );
      expect(mockAdapter.state.attachments.completed).toBe(false);
    });

    it('should handle error in attachment streaming', async () => {
      // Arrange
      const error = { message: 'Streaming error' };
      mockAdapter.streamAttachments.mockResolvedValue({ error });
      mockAdapter.state.attachments = { completed: false };
      
      // Act
      await handleAttachmentsExtraction(mockAdapter);
      
      // Assert
      expect(mockAdapter.streamAttachments).toHaveBeenCalled();
      expect(mockAdapter.emit).toHaveBeenCalledWith(
        ExtractorEventType.ExtractionAttachmentsError,
        { error }
      );
      expect(mockAdapter.state.attachments.completed).toBe(false);
    });

    it('should handle exceptions during attachment streaming', async () => {
      // Arrange
      mockAdapter.streamAttachments.mockRejectedValue(new Error('Unexpected error'));
      mockAdapter.state.attachments = { completed: false };
      
      // Act
      await handleAttachmentsExtraction(mockAdapter);
      
      // Assert
      expect(mockAdapter.streamAttachments).toHaveBeenCalled();
      expect(mockAdapter.emit).toHaveBeenCalledWith(
        ExtractorEventType.ExtractionAttachmentsError,
        { error: { message: 'Unexpected error' } }
      );
    });
  });

  describe('getAttachmentStream', () => {
    it('should return http stream when successful', async () => {
      // Create a mock AirdropEvent
      const mockAirdropEvent: AirdropEvent = {
        context: {
          snap_in_id: 'mock-snap-in-id',
          secrets: { service_account_token: 'mock-token' },
          snap_in_version_id: 'mock-version-id'
        },
        payload: {
          event_type: EventType.ExtractionAttachmentsStart,
          event_context: {
            callback_url: 'https://example.com/callback',
            dev_org: 'dev-org',
            dev_org_id: 'dev-org-id',
            dev_user: 'dev-user',
            dev_user_id: 'dev-user-id',
            external_sync_unit: 'external-sync-unit',
            external_sync_unit_id: 'external-sync-unit-id',
            external_sync_unit_name: 'external-sync-unit-name',
            external_system: 'external-system',
            external_system_type: 'external-system-type',
            import_slug: 'import-slug',
            mode: 'INITIAL',
            request_id: 'request-id',
            snap_in_slug: 'snap-in-slug',
            snap_in_version_id: 'snap-in-version-id',
            sync_run: 'sync-run',
            sync_run_id: 'sync-run-id',
            sync_tier: 'sync-tier',
            sync_unit: 'sync-unit',
            sync_unit_id: 'sync-unit-id',
            uuid: 'uuid',
            worker_data_url: 'worker-data-url'
          },
          connection_data: {
            org_id: 'org-id',
            org_name: 'org-name',
            key: 'key=api-key&token=token',
            key_type: 'key-type'
          }
        },
        execution_metadata: { devrev_endpoint: 'https://api.devrev.ai' },
        input_data: { global_values: {}, event_sources: {} }
      };
      // Arrange
      const mockResponse = { data: 'stream data' };
      (axiosClient.get as jest.Mock).mockResolvedValue(mockResponse);
      
      const item: ExternalSystemAttachmentStreamingParams['item'] = {
        id: 'att123',
        url: 'https://example.com/attachment.pdf',
        file_name: 'attachment.pdf',
        parent_id: 'card123'
      };
      
      // Act
      const result = await getAttachmentStream({ item, event: mockAirdropEvent });
      
      // Assert
      expect(axiosClient.get).toHaveBeenCalledWith(
        'https://example.com/attachment.pdf',
        expect.objectContaining({
          responseType: 'stream',
          headers: { 'Accept-Encoding': 'identity' }
        })
      );
      expect(result).toEqual({ httpStream: mockResponse });
    });

    it('should return error when fetch fails', async () => {
      // Arrange
      // Create a mock AirdropEvent
      const mockAirdropEvent: AirdropEvent = {
        context: {
          snap_in_id: 'mock-snap-in-id',
          secrets: { service_account_token: 'mock-token' },
          snap_in_version_id: 'mock-version-id'
        },
        payload: {
          event_type: EventType.ExtractionAttachmentsStart,
          event_context: {
            callback_url: 'https://example.com/callback',
            dev_org: 'dev-org',
            dev_org_id: 'dev-org-id',
            dev_user: 'dev-user',
            dev_user_id: 'dev-user-id',
            external_sync_unit: 'external-sync-unit',
            external_sync_unit_id: 'external-sync-unit-id',
            external_sync_unit_name: 'external-sync-unit-name',
            external_system: 'external-system',
            external_system_type: 'external-system-type',
            import_slug: 'import-slug',
            mode: 'INITIAL',
            request_id: 'request-id',
            snap_in_slug: 'snap-in-slug',
            snap_in_version_id: 'snap-in-version-id',
            sync_run: 'sync-run',
            sync_run_id: 'sync-run-id',
            sync_tier: 'sync-tier',
            sync_unit: 'sync-unit',
            sync_unit_id: 'sync-unit-id',
            uuid: 'uuid',
            worker_data_url: 'worker-data-url'
          },
          connection_data: {
            org_id: 'org-id',
            org_name: 'org-name',
            key: 'key=api-key&token=token',
            key_type: 'key-type'
          }
        },
        execution_metadata: { devrev_endpoint: 'https://api.devrev.ai' },
        input_data: { global_values: {}, event_sources: {} }
      };
      const error = new Error('Network error');
      (axiosClient.get as jest.Mock).mockRejectedValue(error);
      
      const item: ExternalSystemAttachmentStreamingParams['item'] = {
        id: 'att123',
        url: 'https://example.com/attachment.pdf',
        file_name: 'attachment.pdf',
        parent_id: 'card123'
      };
      
      // Act
      const result = await getAttachmentStream({ item, event: mockAirdropEvent });
      
      // Assert
      expect(result).toEqual({
        error: { message: 'Error while fetching attachment att123 from URL.' }
      });
    });
  });
});