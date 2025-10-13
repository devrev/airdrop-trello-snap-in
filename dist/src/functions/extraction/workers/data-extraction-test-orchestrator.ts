import { TrelloClient } from '../../../core/trello-client';
import {
  createMockTrelloClientInstance,
  createMockRepo,
  createMockAdapter,
  setupMocks,
} from './data-extraction-test-setup';
import {
  runSuccessfulExtractionTest,
  runSkipCompletedExtractionTest,
  runMissingConnectionDataTests,
  runRateLimitingTest,
  runCardsRateLimitingTest,
  runApiErrorTests,
  runNormalizationTests,
  runCardsNormalizationTests,
  runMissingFieldsTests,
  runDateConversionTests,
  runFallbackDateTests,
  runErrorLoggingTests,
  runTimeoutTests,
  runEdgeCaseTests,
  runCardsPaginationTests,
  runCardsCreatorFetchErrorTests,
  runIncrementalModeActivationTest,
  runIncrementalModeFilteringTest,
  runIncrementalModeNotActivatedForContinueTest,
} from './data-extraction-test-scenarios';
import {
  runAttachmentNormalizationTests,
  createAttachmentExtractionTestData,
} from './data-extraction-attachment-tests';

/**
 * Orchestrates all data extraction worker tests
 */
export function runDataExtractionTests(mockTask: any, mockOnTimeout: any) {
  let mockTrelloClientInstance: jest.Mocked<TrelloClient>;
  let mockAdapter: any;
  let mockRepo: any;

  beforeEach(() => {
    setupMocks();

    mockTrelloClientInstance = createMockTrelloClientInstance();
    jest.spyOn(TrelloClient, 'fromConnectionData').mockReturnValue(mockTrelloClientInstance);

    mockRepo = createMockRepo();
    mockAdapter = createMockAdapter();
    mockAdapter.getRepo.mockReturnValue(mockRepo);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('task function', () => {
    it('should successfully extract users data', async () => {
      await runSuccessfulExtractionTest(mockTask, mockTrelloClientInstance, mockAdapter, mockRepo);
    });

    it('should skip extraction if users already completed', async () => {
      await runSkipCompletedExtractionTest(mockTask, mockTrelloClientInstance, mockAdapter);
    });

    it('should handle missing connection data scenarios', async () => {
      await runMissingConnectionDataTests(mockTask, mockAdapter);
    });

    it('should handle rate limiting (429)', async () => {
      await runRateLimitingTest(mockTask, mockTrelloClientInstance, mockAdapter);
    });

    it('should handle cards rate limiting (429)', async () => {
      await runCardsRateLimitingTest(mockTask, mockTrelloClientInstance, mockAdapter);
    });

    it('should handle various API errors', async () => {
      await runApiErrorTests(mockTask, mockTrelloClientInstance, mockAdapter);
    });

    it('should normalize users correctly', async () => {
      await runNormalizationTests(mockTask, mockTrelloClientInstance, mockAdapter, mockRepo);
    });

    it('should normalize cards correctly', async () => {
      await runCardsNormalizationTests(mockTask, mockTrelloClientInstance, mockAdapter, mockRepo);
    });

    it('should handle users with missing optional fields', async () => {
      await runMissingFieldsTests(mockTask, mockTrelloClientInstance, mockAdapter, mockRepo);
    });

    it('should convert Trello ID to created date correctly', async () => {
      await runDateConversionTests(mockTask, mockTrelloClientInstance, mockAdapter);
    });

    it('should use created_date as fallback when lastActive is missing', async () => {
      await runFallbackDateTests(mockTask, mockTrelloClientInstance, mockAdapter);
    });

    it('should log errors when they occur', async () => {
      await runErrorLoggingTests(mockTask, mockTrelloClientInstance, mockAdapter);
    });

    it('should handle cards pagination correctly', async () => {
      await runCardsPaginationTests(mockTask, mockTrelloClientInstance, mockAdapter, mockRepo);
    });

    it('should handle cards creator fetch errors gracefully', async () => {
      await runCardsCreatorFetchErrorTests(mockTask, mockTrelloClientInstance, mockAdapter, mockRepo);
    });

    it('should extract attachments from cards during iteration', async () => {
      const testData = createAttachmentExtractionTestData();
      
      mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue({
        data: testData.mockOrganizationMembers,
        status_code: 200,
        api_delay: 0,
        message: 'Success',
      });

      mockTrelloClientInstance.getBoardCards.mockResolvedValue({
        data: testData.mockBoardCardsWithAttachments,
        status_code: 200,
        api_delay: 0,
        message: 'Success',
      });

      mockTrelloClientInstance.getCardActions.mockResolvedValue({
        data: [{ id: 'action-123', idMemberCreator: '507f1f77bcf86cd799439011' }],
        status_code: 200,
        api_delay: 0,
        message: 'Success',
      });

      await mockTask({ adapter: mockAdapter });

      // Verify attachments were pushed with cardId
      expect(mockRepo.push).toHaveBeenCalledWith(testData.expectedAttachments);
      expect(mockAdapter.state.attachments.completed).toBe(true);
    });

    it('should handle cards without attachments', async () => {
      const testData = createAttachmentExtractionTestData();
      
      mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue({
        data: testData.mockOrganizationMembers,
        status_code: 200,
        api_delay: 0,
        message: 'Success',
      });

      mockTrelloClientInstance.getBoardCards.mockResolvedValue({
        data: testData.mockBoardCardsWithoutAttachments,
        status_code: 200,
        api_delay: 0,
        message: 'Success',
      });

      mockTrelloClientInstance.getCardActions.mockResolvedValue({
        data: [{ id: 'action-123', idMemberCreator: '507f1f77bcf86cd799439011' }],
        status_code: 200,
        api_delay: 0,
        message: 'Success',
      });

      await mockTask({ adapter: mockAdapter });

      // Should not push empty attachments array
      expect(mockRepo.push).not.toHaveBeenCalledWith([]);
      expect(mockAdapter.state.attachments.completed).toBe(true);
    });
  });

  describe('incremental mode', () => {
    it('should activate incremental mode for EXTRACTION_DATA_START', async () => {
      await runIncrementalModeActivationTest(mockTask, mockTrelloClientInstance, mockAdapter, mockRepo);
    });

    it('should filter cards based on modifiedSince in incremental mode', async () => {
      await runIncrementalModeFilteringTest(mockTask, mockTrelloClientInstance, mockAdapter, mockRepo);
    });

    it('should not activate incremental mode for EXTRACTION_DATA_CONTINUE', async () => {
      await runIncrementalModeNotActivatedForContinueTest(mockTask, mockTrelloClientInstance, mockAdapter);
    });
  });

  describe('attachment normalization', () => {
    runAttachmentNormalizationTests(mockTask, mockTrelloClientInstance, mockAdapter, mockRepo);
  });

  describe('onTimeout function', () => {
    it('should handle timeout scenarios', async () => {
      await runTimeoutTests(mockOnTimeout, mockAdapter);
    });
  });

  describe('edge cases', () => {
    it('should handle edge case scenarios', async () => {
      await runEdgeCaseTests(mockTask, mockTrelloClientInstance, mockAdapter, mockRepo);
    });
  });
}