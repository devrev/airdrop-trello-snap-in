// Mock the TrelloClient module before importing
jest.mock('../../../core/trello-client');

import { processTask, ExtractorEventType } from '@devrev/ts-adaas';
import { TrelloClient } from '../../../core/trello-client';
import {
  createMockTrelloClientInstance,
  createMockAdapter,
  createMockBoards,
  createMockBoardWithoutDesc,
  setupMocks,
  expectSuccessfulExtraction,
  expectErrorExtraction,
  createSuccessfulBoardsResponse,
  createErrorResponse,
  expectConsoleError,
} from './external-sync-units-extraction-test-setup';

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
    ExtractionExternalSyncUnitsDone: 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE',
    ExtractionExternalSyncUnitsError: 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR',
  },
}));

describe('external-sync-units-extraction worker', () => {
  let mockTrelloClientInstance: jest.Mocked<TrelloClient>;
  let mockAdapter: any;

  beforeEach(() => {
    setupMocks();
    mockTrelloClientInstance = createMockTrelloClientInstance();
    jest.spyOn(TrelloClient, 'fromConnectionData').mockReturnValue(mockTrelloClientInstance);
    mockAdapter = createMockAdapter();

    // Import the worker file to trigger processTask call
    require('./external-sync-units-extraction');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('task function', () => {
    it('should successfully extract external sync units from boards', async () => {
      const mockBoards = createMockBoards();
      mockTrelloClientInstance.getMemberBoards.mockResolvedValue(createSuccessfulBoardsResponse(mockBoards));

      await mockTask({ adapter: mockAdapter });

      expect(TrelloClient.fromConnectionData).toHaveBeenCalledWith('key=test-api-key&token=test-token');
      expect(mockTrelloClientInstance.getMemberBoards).toHaveBeenCalledTimes(1);
      expectSuccessfulExtraction(mockAdapter, [
        {
          id: 'board-1',
          name: 'Test Board 1',
          description: 'Test board description',
          item_type: 'cards',
        },
        {
          id: 'board-2',
          name: 'Test Board 2',
          description: '',
          item_type: 'cards',
        },
      ]);
    });

    it('should handle empty boards response', async () => {
      mockTrelloClientInstance.getMemberBoards.mockResolvedValue(createSuccessfulBoardsResponse([]));

      await mockTask({ adapter: mockAdapter });

      expectSuccessfulExtraction(mockAdapter, []);
    });

    it('should handle missing connection data', async () => {
      mockAdapter.event.payload.connection_data = null;

      await mockTask({ adapter: mockAdapter });

      expectErrorExtraction(mockAdapter, 'Missing connection data or API key');
    });

    it('should handle missing API key', async () => {
      mockAdapter.event.payload.connection_data = {};

      await mockTask({ adapter: mockAdapter });

      expectErrorExtraction(mockAdapter, 'Missing connection data or API key');
    });

    it('should handle API error response', async () => {
      mockTrelloClientInstance.getMemberBoards.mockResolvedValue(createErrorResponse(401, 'Unauthorized'));

      await mockTask({ adapter: mockAdapter });

      expectErrorExtraction(mockAdapter, 'Failed to fetch boards: Unauthorized');
    });

    it('should handle TrelloClient creation error', async () => {
      jest.spyOn(TrelloClient, 'fromConnectionData').mockImplementation(() => {
        throw new Error('Invalid connection data');
      });

      await mockTask({ adapter: mockAdapter });

      expectErrorExtraction(mockAdapter, 'Invalid connection data');
    });

    it('should handle API call rejection', async () => {
      mockTrelloClientInstance.getMemberBoards.mockRejectedValue(new Error('Network error'));

      await mockTask({ adapter: mockAdapter });

      expectErrorExtraction(mockAdapter, 'Network error');
    });

    it('should handle unknown errors', async () => {
      mockTrelloClientInstance.getMemberBoards.mockRejectedValue('string error');

      await mockTask({ adapter: mockAdapter });

      expectErrorExtraction(mockAdapter, 'Unknown error occurred during external sync units extraction');
    });

    it('should normalize boards correctly with missing description', async () => {
      const mockBoards = createMockBoardWithoutDesc();
      mockTrelloClientInstance.getMemberBoards.mockResolvedValue(createSuccessfulBoardsResponse(mockBoards));

      await mockTask({ adapter: mockAdapter });

      expectSuccessfulExtraction(mockAdapter, [
        {
          id: 'board-1',
          name: 'Test Board',
          description: '',
          item_type: 'cards',
        },
      ]);
    });

    it('should log errors when they occur', async () => {
      const consoleSpy = expectConsoleError('Test error');
      const testError = new Error('Test error');
      
      mockTrelloClientInstance.getMemberBoards.mockRejectedValue(testError);

      await mockTask({ adapter: mockAdapter });

      expect(consoleSpy).toHaveBeenCalledWith('External sync units extraction error:', {
        error_message: 'Test error',
        error_stack: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });

  describe('onTimeout function', () => {
    it('should emit error event on timeout', async () => {
      await mockOnTimeout({ adapter: mockAdapter });

      expectErrorExtraction(mockAdapter, 'Failed to extract external sync units. Lambda timeout.');
    });

    it('should log timeout error', async () => {
      const consoleSpy = expectConsoleError('External sync units extraction timeout');

      await mockOnTimeout({ adapter: mockAdapter });

      expect(consoleSpy).toHaveBeenCalledWith('External sync units extraction timeout');
    });

    it('should handle errors in timeout handler', async () => {
      const consoleSpy = expectConsoleError('Emit error');
      mockAdapter.emit.mockRejectedValue(new Error('Emit error'));

      await mockOnTimeout({ adapter: mockAdapter });

      expect(consoleSpy).toHaveBeenCalledWith('Error handling timeout in external sync units extraction:', {
        error_message: 'Emit error',
        error_stack: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should handle unknown errors in timeout handler', async () => {
      const consoleSpy = expectConsoleError('string error');
      mockAdapter.emit.mockRejectedValue('string error');

      await mockOnTimeout({ adapter: mockAdapter });

      expect(consoleSpy).toHaveBeenCalledWith('Error handling timeout in external sync units extraction:', {
        error_message: 'Unknown error',
        error_stack: undefined,
        timestamp: expect.any(String),
      });
    });
  });
});