// Mock the external domain metadata
const mockExternalDomainMetadata = {
  schema_version: "v0.2.0",
  record_types: {
    users: {
      name: "Users",
      fields: {
        full_name: {
          name: "Full Name",
          type: "text",
          is_required: true
        }
      }
    }
  }
};

jest.mock('../../../core/external-domain-metadata.json', () => mockExternalDomainMetadata);

import { processTask, ExtractorEventType } from '@devrev/ts-adaas';

// Mock processTask to capture the task and onTimeout functions
let mockTask: any;
let mockOnTimeout: any;

jest.mock('@devrev/ts-adaas', () => ({
  ...jest.requireActual('@devrev/ts-adaas'),
  processTask: jest.fn(({ task, onTimeout }) => {
    mockTask = task;
    mockOnTimeout = onTimeout;
  }),
  ExtractorEventType: {
    ExtractionMetadataDone: 'EXTRACTION_METADATA_DONE',
    ExtractionMetadataError: 'EXTRACTION_METADATA_ERROR',
  },
}));

describe('metadata-extraction worker', () => {
  let mockAdapter: any;
  let mockRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockRepo = {
      push: jest.fn().mockResolvedValue(true),
    };

    mockAdapter = {
      initializeRepos: jest.fn(),
      getRepo: jest.fn().mockReturnValue(mockRepo),
      emit: jest.fn().mockResolvedValue(undefined),
    };

    // Import the worker file to trigger processTask call
    require('./metadata-extraction');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('task function', () => {
    it('should successfully extract metadata', async () => {
      await mockTask({ adapter: mockAdapter });

      expect(mockAdapter.initializeRepos).toHaveBeenCalledWith([
        { itemType: "external_domain_metadata" }
      ]);
      expect(mockAdapter.getRepo).toHaveBeenCalledWith("external_domain_metadata");
      expect(mockRepo.push).toHaveBeenCalledWith([mockExternalDomainMetadata]);
      expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionMetadataDone);
    });

    it('should handle initializeRepos error', async () => {
      const testError = new Error('Initialize repos failed');
      mockAdapter.initializeRepos.mockImplementation(() => {
        throw testError;
      });

      await mockTask({ adapter: mockAdapter });

      expect(mockAdapter.emit).toHaveBeenCalledWith(
        ExtractorEventType.ExtractionMetadataError,
        {
          error: { message: 'Initialize repos failed' },
        }
      );
    });

    it('should handle getRepo returning null', async () => {
      mockAdapter.getRepo.mockReturnValue(null);

      await mockTask({ adapter: mockAdapter });

      expect(mockAdapter.initializeRepos).toHaveBeenCalled();
      expect(mockAdapter.getRepo).toHaveBeenCalledWith("external_domain_metadata");
      expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionMetadataDone);
    });

    it('should handle repo push error', async () => {
      const testError = new Error('Push failed');
      mockRepo.push.mockRejectedValue(testError);

      await mockTask({ adapter: mockAdapter });

      expect(mockAdapter.emit).toHaveBeenCalledWith(
        ExtractorEventType.ExtractionMetadataError,
        {
          error: { message: 'Push failed' },
        }
      );
    });

    it('should handle emit success error', async () => {
      const testError = new Error('Emit failed');
      mockAdapter.emit
        .mockRejectedValueOnce(testError) // First call (success) fails
        .mockResolvedValueOnce(undefined); // Second call (error) succeeds

      await mockTask({ adapter: mockAdapter });

      expect(mockAdapter.emit).toHaveBeenCalledTimes(2);
      expect(mockAdapter.emit).toHaveBeenNthCalledWith(1, ExtractorEventType.ExtractionMetadataDone);
      expect(mockAdapter.emit).toHaveBeenNthCalledWith(2, ExtractorEventType.ExtractionMetadataError, {
        error: { message: 'Failed to emit success event after successful metadata extraction' },
      });
    });

    it('should handle unknown errors', async () => {
      mockAdapter.initializeRepos.mockImplementation(() => {
        throw 'string error';
      });

      await mockTask({ adapter: mockAdapter });

      expect(mockAdapter.emit).toHaveBeenCalledWith(
        ExtractorEventType.ExtractionMetadataError,
        {
          error: { message: 'Failed to extract metadata' },
        }
      );
    });

    it('should log errors when they occur', async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const testError = new Error('Test error');
      
      mockAdapter.initializeRepos.mockImplementation(() => {
        throw testError;
      });

      await mockTask({ adapter: mockAdapter });

      expect(consoleSpy).toHaveBeenCalledWith('Metadata extraction error:', {
        error_message: 'Test error',
        error_stack: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should log unknown errors correctly', async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      
      mockAdapter.initializeRepos.mockImplementation(() => {
        throw 'string error';
      });

      await mockTask({ adapter: mockAdapter });

      expect(consoleSpy).toHaveBeenCalledWith('Metadata extraction error:', {
        error_message: 'Unknown error',
        error_stack: undefined,
        timestamp: expect.any(String),
      });
    });

    it('should push metadata without normalization', async () => {
      await mockTask({ adapter: mockAdapter });

      // Verify that the exact metadata object is pushed without any transformation
      expect(mockRepo.push).toHaveBeenCalledWith([mockExternalDomainMetadata]);
      
      // Verify the structure is preserved
      const pushedData = mockRepo.push.mock.calls[0][0][0];
      expect(pushedData).toEqual(mockExternalDomainMetadata);
      expect(pushedData.schema_version).toBe("v0.2.0");
      expect(pushedData.record_types.users.name).toBe("Users");
    });
  });

  describe('onTimeout function', () => {
    it('should emit error event on timeout', async () => {
      await mockOnTimeout({ adapter: mockAdapter });

      expect(mockAdapter.emit).toHaveBeenCalledWith(
        ExtractorEventType.ExtractionMetadataError,
        {
          error: { message: "Failed to extract metadata. Lambda timeout." },
        }
      );
    });

    it('should handle emit error in timeout', async () => {
      const testError = new Error('Emit timeout error');
      mockAdapter.emit.mockRejectedValue(testError);

      // Should not throw, just silently handle the error
      await expect(mockOnTimeout({ adapter: mockAdapter })).resolves.toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should complete full successful flow', async () => {
      await mockTask({ adapter: mockAdapter });

      // Verify the complete flow
      expect(mockAdapter.initializeRepos).toHaveBeenCalledTimes(1);
      expect(mockAdapter.getRepo).toHaveBeenCalledTimes(1);
      expect(mockRepo.push).toHaveBeenCalledTimes(1);
      expect(mockAdapter.emit).toHaveBeenCalledTimes(1);
      expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionMetadataDone);
    });

    it('should handle partial failures gracefully', async () => {
      // Simulate repo.push succeeding but emit failing
      mockAdapter.emit.mockRejectedValueOnce(new Error('Network error'));

      await mockTask({ adapter: mockAdapter });

      // Should still attempt to emit error
      expect(mockAdapter.emit).toHaveBeenCalledTimes(2);
    });
  });
});