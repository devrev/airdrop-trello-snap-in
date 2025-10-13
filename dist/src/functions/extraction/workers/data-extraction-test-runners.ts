import { ExtractorEventType, EventType, SyncMode } from '@devrev/ts-adaas';
import { TrelloClient } from '../../../core/trello-client';
import { isCardModifiedAfter } from './data-extraction-utils';
import {
  createMockOrganizationMembers,
  createSuccessfulResponse,
  createMockBoardCards,
  createSuccessfulCardsResponse,
  createSuccessfulActionsResponse,
  createUserWithInvalidId,
  expectConsoleError,
  MockExtractionState,
} from './data-extraction-test-setup';

// Re-export core test runners
export {
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
} from './data-extraction-test-runners-core';

// Re-export incremental mode test runners
export {
  runIncrementalModeActivationTest,
  runIncrementalModeFilteringTest,
  runIncrementalModeNotActivatedForContinueTest,
} from './data-extraction-test-runners-incremental';

/**
 * Specialized test execution functions for data extraction worker
 */

export const runEdgeCaseTests = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any,
  mockRepo: any
) => {
  // Test invalid Trello ID for date conversion
  const userWithInvalidId = createUserWithInvalidId();
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createSuccessfulResponse([userWithInvalidId])
  );
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(createSuccessfulCardsResponse([]));

  await mockTask({ adapter: mockAdapter });

  const normalizeFunction = mockAdapter.initializeRepos.mock.calls[0][0][0].normalize;
  const normalizedUser = normalizeFunction(userWithInvalidId);
  
  // Should fallback to current time
  expect(normalizedUser.created_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  expect(new Date(normalizedUser.created_date)).toBeInstanceOf(Date);

  // Test empty organization members response
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createSuccessfulResponse([])
  );
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(createSuccessfulCardsResponse([]));

  // Reset state and mocks
  const state = mockAdapter.state as MockExtractionState;
  state.users.completed = false;
  mockAdapter.emit.mockClear();
  mockRepo.push.mockClear();

  await mockTask({ adapter: mockAdapter });

  expect(mockRepo.push).toHaveBeenCalledWith([]);
  expect(state.users.completed).toBe(true);
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDone);
};

export const runCardsPaginationTests = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any,
  mockRepo: any
) => {
  const mockOrganizationMembers = createMockOrganizationMembers();
  const mockBoardCards = createMockBoardCards();
  const boardCards = mockBoardCards || [];
  
  // Create full page (10 cards) for first call, empty for second
  const fullPage = Array(10).fill(null).map((_, i) => ({
    ...boardCards[0],
    id: `card-${i}`,
    name: `Card ${i}`,
  }));
  
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createSuccessfulResponse(mockOrganizationMembers)
  );
  mockTrelloClientInstance.getBoardCards
    .mockResolvedValueOnce(createSuccessfulCardsResponse(fullPage))
    .mockResolvedValueOnce(createSuccessfulCardsResponse([]));
  // Mock getCardActions for each card in the full page
  for (let i = 0; i < 10; i++) {
    mockTrelloClientInstance.getCardActions.mockResolvedValueOnce(
    createSuccessfulActionsResponse('507f1f77bcf86cd799439011')
  );
  }

  await mockTask({ adapter: mockAdapter });

  expect(mockTrelloClientInstance.getBoardCards).toHaveBeenCalledTimes(2);
  expect(mockTrelloClientInstance.getBoardCards).toHaveBeenNthCalledWith(1, 'test-board-id', 10, undefined);
  expect(mockTrelloClientInstance.getBoardCards).toHaveBeenNthCalledWith(2, 'test-board-id', 10, 'card-0');
  const state = mockAdapter.state as MockExtractionState;
  expect(state.cards.completed).toBe(true);
};

export const runCardsCreatorFetchErrorTests = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any,
  mockRepo: any
) => {
  const mockOrganizationMembers = createMockOrganizationMembers();
  const mockBoardCards = createMockBoardCards();
  const boardCards = mockBoardCards || [];
  
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createSuccessfulResponse(mockOrganizationMembers)
  );
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(
    createSuccessfulCardsResponse(boardCards)
  );
  mockTrelloClientInstance.getCardActions.mockRejectedValue(new Error('Actions fetch failed'));

  await mockTask({ adapter: mockAdapter });

  // Should still complete successfully even if creator fetch fails
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDone);
};