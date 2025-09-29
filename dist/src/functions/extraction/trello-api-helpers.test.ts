import { extractCards } from './trello-api-helpers';
import { TrelloClient } from '../../core/trello-client';

// Mock the TrelloClient
jest.mock('../../core/trello-client');

describe('extractCards incremental mode', () => {
  let mockAdapter: any;
  let mockTrelloClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdapter = {
      event: {
        payload: {
          connection_data: {
            key: 'key=test-api-key&token=test-token',
          },
          event_context: {
            external_sync_unit_id: 'test-board-id',
          },
        },
      },
      state: {
        cards: {
          completed: false,
        },
      },
      getRepo: jest.fn().mockReturnValue({
        push: jest.fn(),
      }),
      emit: jest.fn(),
    };

    mockTrelloClient = {
      getBoardCards: jest.fn(),
    };

    (TrelloClient as jest.MockedClass<typeof TrelloClient>).mockImplementation(() => mockTrelloClient);
    jest.spyOn(TrelloClient, 'parseCredentials').mockReturnValue({
      apiKey: 'test-api-key',
      token: 'test-token',
    });
  });

  it('should filter cards by dateLastActivity in incremental mode', async () => {
    // Set up incremental mode with modifiedSince
    const modifiedSince = '2023-01-15T00:00:00Z';
    mockAdapter.state.cards.modifiedSince = modifiedSince;

    const mockCards = [
      {
        id: 'card1',
        name: 'Old Card',
        dateLastActivity: '2023-01-10T00:00:00Z', // Before modifiedSince
        attachments: [],
      },
      {
        id: 'card2',
        name: 'New Card',
        dateLastActivity: '2023-01-20T00:00:00Z', // After modifiedSince
        attachments: [
          {
            id: 'attachment1',
            name: 'test.pdf',
            url: 'https://example.com/test.pdf',
          },
        ],
      },
    ];

    mockTrelloClient.getBoardCards.mockResolvedValue({
      status_code: 200,
      data: mockCards,
      api_delay: 0,
      message: 'Success',
    });

    await extractCards(mockAdapter);

    // Verify that only the new card was pushed
    const cardsRepo = mockAdapter.getRepo('cards');
    expect(cardsRepo.push).toHaveBeenCalledWith([mockCards[1]]); // Only the new card

    // Verify that only attachments from the new card were pushed
    const attachmentsRepo = mockAdapter.getRepo('attachments');
    expect(attachmentsRepo.push).toHaveBeenCalledWith([
      {
        id: 'attachment1',
        name: 'test.pdf',
        url: 'https://example.com/test.pdf',
        parent_id: 'card2',
      },
    ]);
  });

  it('should not filter cards when modifiedSince is not set', async () => {
    // No modifiedSince set (initial mode)
    const mockCards = [
      {
        id: 'card1',
        name: 'Card 1',
        dateLastActivity: '2023-01-10T00:00:00Z',
        attachments: [],
      },
      {
        id: 'card2',
        name: 'Card 2',
        dateLastActivity: '2023-01-20T00:00:00Z',
        attachments: [],
      },
    ];

    mockTrelloClient.getBoardCards.mockResolvedValue({
      status_code: 200,
      data: mockCards,
      api_delay: 0,
      message: 'Success',
    });

    await extractCards(mockAdapter);

    // Verify that all cards were pushed
    const cardsRepo = mockAdapter.getRepo('cards');
    expect(cardsRepo.push).toHaveBeenCalledWith(mockCards);
  });

  it('should handle empty filtered results in incremental mode', async () => {
    // Set up incremental mode with modifiedSince
    const modifiedSince = '2023-01-20T00:00:00Z';
    mockAdapter.state.cards.modifiedSince = modifiedSince;

    const mockCards = [
      {
        id: 'card1',
        name: 'Old Card',
        dateLastActivity: '2023-01-10T00:00:00Z', // Before modifiedSince
        attachments: [],
      },
    ];

    mockTrelloClient.getBoardCards.mockResolvedValue({
      status_code: 200,
      data: mockCards,
      api_delay: 0,
      message: 'Success',
    });

    await extractCards(mockAdapter);

    // Verify that empty array was pushed
    const cardsRepo = mockAdapter.getRepo('cards');
    expect(cardsRepo.push).toHaveBeenCalledWith([]);

    // Verify that empty attachments array was pushed
    const attachmentsRepo = mockAdapter.getRepo('attachments');
    expect(attachmentsRepo.push).toHaveBeenCalledWith([]);
  });
});