import { ExtractorEventType } from '@devrev/ts-adaas';
import { TrelloClient } from '../../../core/trello-client';
import {
  createMockOrganizationMembers,
  createSuccessfulResponse,
  createMockBoardCards,
  createSuccessfulCardsResponse,
  createSuccessfulActionsResponse,
  createRateLimitResponse,
  createErrorResponse,
  createUsersWithMissingFields,
  createUserWithoutLastActive,
  createUserWithInvalidId,
  expectConsoleError,
  MockExtractionState,
} from './data-extraction-test-setup';

/**
 * Core test execution functions for data extraction worker
 */

export const runSuccessfulExtractionTest = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any,
  mockRepo: any
) => {
  const mockOrganizationMembers = createMockOrganizationMembers();
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createSuccessfulResponse(mockOrganizationMembers)
  );
  const mockBoardCards = createMockBoardCards();
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(
    createSuccessfulCardsResponse(mockBoardCards)
  );
  mockTrelloClientInstance.getCardActions
    .mockResolvedValueOnce(createSuccessfulActionsResponse('507f1f77bcf86cd799439011'))
    .mockResolvedValueOnce(createSuccessfulActionsResponse('507f1f77bcf86cd799439012'));

  await mockTask({ adapter: mockAdapter });

  expect(TrelloClient.fromConnectionData).toHaveBeenCalledWith('key=test-api-key&token=test-token');
  expect(mockTrelloClientInstance.getOrganizationMembers).toHaveBeenCalledWith('test-org-id');
  expect(mockTrelloClientInstance.getBoardCards).toHaveBeenCalledWith('test-board-id', 10, undefined);
  expect(mockAdapter.initializeRepos).toHaveBeenCalledWith([
    {
      itemType: 'users',
      normalize: expect.any(Function),
    },
    {
      itemType: 'cards',
      normalize: expect.any(Function),
    },
    {
      itemType: 'attachments',
      normalize: expect.any(Function),
    },
  ]);
  expect(mockRepo.push).toHaveBeenCalledWith(mockOrganizationMembers);
  
  // Cards should be enhanced with createdBy information
  const boardCards = mockBoardCards || [];
  const expectedCardsWithCreators = boardCards.map((card, index) => ({
    ...card,
    createdBy: index === 0 ? '507f1f77bcf86cd799439011' : '507f1f77bcf86cd799439012',
  }));
  expect(mockRepo.push).toHaveBeenCalledWith(expectedCardsWithCreators);
  
  // Attachments should be pushed with cardId
  const expectedAttachments = [
    { ...boardCards[0].attachments![0], cardId: boardCards[0].id },
  ];
  expect(mockRepo.push).toHaveBeenCalledWith(expectedAttachments);
  
  const state = mockAdapter.state as MockExtractionState;
  expect(state.users.completed).toBe(true);
  expect(state.cards.completed).toBe(true);
  expect(state.attachments.completed).toBe(true);
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDone);
};

export const runSkipCompletedExtractionTest = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any
) => {
  const state = mockAdapter.state as MockExtractionState;
  state.users.completed = true;
  state.cards.completed = true;

  await mockTask({ adapter: mockAdapter });

  expect(mockTrelloClientInstance.getOrganizationMembers).not.toHaveBeenCalled();
  expect(mockTrelloClientInstance.getBoardCards).not.toHaveBeenCalled();
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDone);
};

export const runMissingConnectionDataTests = async (
  mockTask: any,
  mockAdapter: any
) => {
  // Test missing event context
  mockAdapter.event.payload.event_context = null;
  await mockTask({ adapter: mockAdapter });
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
    error: { message: 'Missing board ID in event context' },
  });

  // Reset and test missing connection data
  mockAdapter.emit.mockClear();
  mockAdapter.event.payload.event_context = { external_sync_unit_id: 'test-board-id' };
  // Test missing connection data
  mockAdapter.event.payload.connection_data = null;
  await mockTask({ adapter: mockAdapter });
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
    error: { message: 'Missing connection data or API key' },
  });

  // Reset and test missing API key
  mockAdapter.emit.mockClear();
  mockAdapter.event.payload.connection_data = { org_id: 'test-org' };
  await mockTask({ adapter: mockAdapter });
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
    error: { message: 'Missing connection data or API key' },
  });

  // Reset and test missing organization ID
  mockAdapter.emit.mockClear();
  mockAdapter.event.payload.connection_data = { key: 'test-key' };
  await mockTask({ adapter: mockAdapter });
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
    error: { message: 'Missing organization ID in connection data' },
  });
};

export const runRateLimitingTest = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any
) => {
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(createRateLimitResponse(60));
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(createSuccessfulCardsResponse([]));

  await mockTask({ adapter: mockAdapter });

  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDelay, {
    delay: 60,
  });
};

export const runCardsRateLimitingTest = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any
) => {
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(createSuccessfulResponse([]));
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(createRateLimitResponse(30));

  await mockTask({ adapter: mockAdapter });

  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDelay, {
    delay: 30,
  });
};

export const runApiErrorTests = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any
) => {
  // Test API error response
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createErrorResponse(401, 'Unauthorized')
  );
  await mockTask({ adapter: mockAdapter });
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
    error: { message: 'Failed to fetch organization members: Unauthorized' },
  });

  // Reset and test TrelloClient creation error
  mockAdapter.emit.mockClear();
  jest.spyOn(TrelloClient, 'fromConnectionData').mockImplementation(() => {
    throw new Error('Invalid connection data');
  });
  await mockTask({ adapter: mockAdapter });
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
    error: { message: 'Invalid connection data' },
  });

  // Reset and test API call rejection
  mockAdapter.emit.mockClear();
  jest.spyOn(TrelloClient, 'fromConnectionData').mockReturnValue(mockTrelloClientInstance);
  mockTrelloClientInstance.getOrganizationMembers.mockRejectedValue(new Error('Network error'));
  await mockTask({ adapter: mockAdapter });
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
    error: { message: 'Network error' },
  });

  // Reset and test unknown errors
  mockAdapter.emit.mockClear();
  mockTrelloClientInstance.getOrganizationMembers.mockRejectedValue('string error');
  await mockTask({ adapter: mockAdapter });
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataError, {
    error: { message: 'Unknown error occurred during data extraction' },
  });
};

export const runNormalizationTests = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any,
  mockRepo: any
) => {
  const mockOrganizationMembers = createMockOrganizationMembers();
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createSuccessfulResponse(mockOrganizationMembers)
  );
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(createSuccessfulCardsResponse([]));

  await mockTask({ adapter: mockAdapter });

  // Get the normalize function that was passed to initializeRepos
  const normalizeFunction = mockAdapter.initializeRepos.mock.calls[0][0][0].normalize;
  
  const normalizedUser = normalizeFunction(mockOrganizationMembers[0]);
  
  expect(normalizedUser).toEqual({
    id: '507f1f77bcf86cd799439011',
    created_date: expect.any(String),
    modified_date: '2025-01-01T12:00:00.000Z',
    data: {
      full_name: 'John Doe',
      username: 'johndoe',
    },
  });
};

export const runCardsNormalizationTests = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any,
  mockRepo: any
) => {
  const mockOrganizationMembers = createMockOrganizationMembers();
  const mockBoardCards = createMockBoardCards();
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createSuccessfulResponse(mockOrganizationMembers)
  );
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(
    createSuccessfulCardsResponse(mockBoardCards)
  );
  mockTrelloClientInstance.getCardActions.mockResolvedValueOnce(
    createSuccessfulActionsResponse('507f1f77bcf86cd799439011')
  );

  await mockTask({ adapter: mockAdapter });

  // Get the normalize function that was passed to initializeRepos for cards
  const normalizeFunction = mockAdapter.initializeRepos.mock.calls[0][0][1].normalize;
  
  const boardCards = mockBoardCards || [];
  const normalizedCard = normalizeFunction({ ...boardCards[0], createdBy: '507f1f77bcf86cd799439011' });
  
  expect(normalizedCard.data.name).toBe('Test Card 1');
  expect(normalizedCard.data.description).toEqual(['Test card description', 'Second line']);
  expect(normalizedCard.data.created_by).toBe('507f1f77bcf86cd799439011');
};

export const runMissingFieldsTests = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any,
  mockRepo: any
) => {
  const usersWithMissingFields = createUsersWithMissingFields();
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createSuccessfulResponse(usersWithMissingFields)
  );
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(createSuccessfulCardsResponse([]));

  await mockTask({ adapter: mockAdapter });

  expect(mockRepo.push).toHaveBeenCalledWith(usersWithMissingFields);
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataDone);
};

export const runDateConversionTests = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any
) => {
  const mockOrganizationMembers = createMockOrganizationMembers();
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createSuccessfulResponse([mockOrganizationMembers[0]])
  );
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(createSuccessfulCardsResponse([]));

  await mockTask({ adapter: mockAdapter });

  const normalizeFunction = mockAdapter.initializeRepos.mock.calls[0][0][0].normalize;
  const normalizedUser = normalizeFunction(mockOrganizationMembers[0]);
  
  // The ID '507f1f77bcf86cd799439011' should convert to a valid date
  expect(normalizedUser.created_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  expect(new Date(normalizedUser.created_date)).toBeInstanceOf(Date);
};

export const runFallbackDateTests = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any
) => {
  const userWithoutLastActive = createUserWithoutLastActive();
  mockTrelloClientInstance.getOrganizationMembers.mockResolvedValue(
    createSuccessfulResponse([userWithoutLastActive])
  );
  mockTrelloClientInstance.getBoardCards.mockResolvedValue(createSuccessfulCardsResponse([]));

  await mockTask({ adapter: mockAdapter });

  const normalizeFunction = mockAdapter.initializeRepos.mock.calls[0][0][0].normalize;
  const normalizedUser = normalizeFunction(userWithoutLastActive);
  
  expect(normalizedUser.created_date).toBe(normalizedUser.modified_date);
};

export const runErrorLoggingTests = async (
  mockTask: any,
  mockTrelloClientInstance: jest.Mocked<TrelloClient>,
  mockAdapter: any
) => {
  const consoleSpy = expectConsoleError();
  const testError = new Error('Test error');
  
  mockTrelloClientInstance.getOrganizationMembers.mockRejectedValue(testError);

  await mockTask({ adapter: mockAdapter });

  expect(consoleSpy).toHaveBeenCalledWith('Data extraction error:', {
    error_message: 'Test error',
    error_stack: expect.any(String),
    timestamp: expect.any(String),
  });
};

export const runTimeoutTests = async (
  mockOnTimeout: any,
  mockAdapter: any
) => {
  // Test normal timeout
  await mockOnTimeout({ adapter: mockAdapter });
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionDataProgress);

  // Test timeout logging
  const consoleSpy = expectConsoleError();
  mockAdapter.emit.mockClear();
  await mockOnTimeout({ adapter: mockAdapter });
  expect(consoleSpy).toHaveBeenCalledWith('Data extraction timeout');

  // Test timeout error handling
  mockAdapter.emit.mockClear();
  consoleSpy.mockClear();
  mockAdapter.emit.mockRejectedValue(new Error('Emit error'));
  await mockOnTimeout({ adapter: mockAdapter });
  expect(consoleSpy).toHaveBeenCalledWith('Error handling timeout in data extraction:', {
    error_message: 'Emit error',
    error_stack: expect.any(String),
    timestamp: expect.any(String),
  });

  // Test unknown timeout errors
  mockAdapter.emit.mockClear();
  consoleSpy.mockClear();
  mockAdapter.emit.mockRejectedValue('string error');
  await mockOnTimeout({ adapter: mockAdapter });
  expect(consoleSpy).toHaveBeenCalledWith('Error handling timeout in data extraction:', {
    error_message: 'Unknown error',
    error_stack: undefined,
    timestamp: expect.any(String),
  });
};