import { EventType, SyncMode } from '@devrev/ts-adaas';
import { TrelloClient } from '../../../core/trello-client';
import {
  createMockOrganizationMembers,
  createSuccessfulResponse,
  createSuccessfulCardsResponse,
  createSuccessfulActionsResponse,
  createMockBoardCardsForIncremental,
  MockExtractionState,
} from './data-extraction-test-setup';

/**
 * Test execution functions for incremental mode functionality
 */

export const runIncrementalModeActivationTest = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any,
  mockRepo: any
) => {
  const lastSuccessfulSync = '2025-01-01T00:00:00.000Z';
  mockAdapter.state.lastSuccessfulSyncStarted = lastSuccessfulSync;
  mockAdapter.event.payload.event_context.mode = SyncMode.INCREMENTAL;
  mockAdapter.event.payload.event_type = EventType.ExtractionDataStart;

  const mockOrganizationMembers = createMockOrganizationMembers();
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createSuccessfulResponse(mockOrganizationMembers)
  );
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(
    createSuccessfulCardsResponse([])
  );

  await mockTask({ adapter: mockAdapter });

  const state = mockAdapter.state as MockExtractionState;
  expect(state.cards.modifiedSince).toBe(lastSuccessfulSync);
  expect(state.cards.completed).toBe(true); // Completed because no cards returned
  expect(state.attachments.completed).toBe(true);
};

export const runIncrementalModeFilteringTest = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any,
  mockRepo: any
) => {
  const lastSuccessfulSync = '2025-01-01T12:00:00.000Z';
  mockAdapter.state.lastSuccessfulSyncStarted = lastSuccessfulSync;
  mockAdapter.event.payload.event_context.mode = SyncMode.INCREMENTAL;
  mockAdapter.event.payload.event_type = EventType.ExtractionDataStart;

  const mockOrganizationMembers = createMockOrganizationMembers();
  const mockCards = createMockBoardCardsForIncremental(lastSuccessfulSync);
  
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createSuccessfulResponse(mockOrganizationMembers)
  );
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(
    createSuccessfulCardsResponse(mockCards)
  );
  mockTrelloClientInstance.getCardActions.mockResolvedValue(
    createSuccessfulActionsResponse('507f1f77bcf86cd799439011')
  );

  await mockTask({ adapter: mockAdapter });

  // Should only push the new card (second one)
  const cardsPushCall = mockRepo.push.mock.calls.find((call: any) => 
    call[0].length > 0 && call[0][0].name
  );
  expect(cardsPushCall).toBeDefined();
  expect(cardsPushCall[0]).toHaveLength(1);
  expect(cardsPushCall[0][0].name).toBe('New Card');
};

export const runIncrementalModeNotActivatedForContinueTest = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any
) => {
  mockAdapter.state.lastSuccessfulSyncStarted = '2025-01-01T00:00:00.000Z';
  mockAdapter.event.payload.event_context.mode = SyncMode.INCREMENTAL;
  mockAdapter.event.payload.event_type = EventType.ExtractionDataContinue;

  const mockOrganizationMembers = createMockOrganizationMembers();
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createSuccessfulResponse(mockOrganizationMembers)
  );
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(
    createSuccessfulCardsResponse([])
  );

  await mockTask({ adapter: mockAdapter });

  const state = mockAdapter.state as MockExtractionState;
  expect(state.cards.modifiedSince).toBeUndefined();
};