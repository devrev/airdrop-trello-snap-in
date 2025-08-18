import { fetch_board_cards } from './index';
import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello_client';

// Mock the TrelloClient
jest.mock('../../core/trello_client');

describe('fetch_board_cards function', () => {
  // Mock function input
  const mockFunctionInput: FunctionInput = {
    payload: {
      connection_data: {
        key: 'key=test_api_key&token=test_token',
      },
      event_context: {
        external_sync_unit_id: 'test_board_id',
      },
      limit: 100
    },
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token'
      }
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: 'fetch_board_cards',
      event_type: 'test-event-type',
      devrev_endpoint: 'https://api.devrev.ai/'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success with cards when fetching is successful', async () => {
    // Arrange
    const mockCards = [
      {
        id: 'card1',
        name: 'Task 1',
        desc: 'Description for task 1',
        url: 'https://trello.com/c/abc123/task-1',
        shortUrl: 'https://trello.com/c/abc123',
        closed: false,
        idList: 'list1',
        idBoard: 'test_board_id',
        due: '2023-09-15T14:00:00Z',
        dueComplete: false,
        dateLastActivity: '2023-08-15T14:30:00Z',
        pos: 65535,
        labels: [{ id: 'label1', name: 'Priority', color: 'red' }],
        idMembers: ['member1', 'member2']
      },
      {
        id: 'card2',
        name: 'Task 2',
        desc: '',
        url: 'https://trello.com/c/def456/task-2',
        shortUrl: 'https://trello.com/c/def456',
        closed: false,
        idList: 'list2',
        idBoard: 'test_board_id',
        due: null,
        dueComplete: false,
        dateLastActivity: '2023-08-10T09:15:00Z',
        pos: 131070,
        labels: [],
        idMembers: []
      }
    ];
    
    // Mock the getBoardCards method to return a successful response
    (TrelloClient as jest.Mock).mockImplementation(() => ({
      getBoardCards: jest.fn().mockResolvedValue(mockCards)
    }));
    
    const events = [mockFunctionInput];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await fetch_board_cards(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Successfully fetched 2 cards from board',
      cards: [
        {
          id: 'card1',
          name: 'Task 1',
          description: 'Description for task 1',
          url: 'https://trello.com/c/abc123/task-1',
          short_url: 'https://trello.com/c/abc123',
          closed: false,
          list_id: 'list1',
          board_id: 'test_board_id',
          due: '2023-09-15T14:00:00Z',
          due_complete: false,
          date_last_activity: '2023-08-15T14:30:00Z',
          position: 65535,
          labels: [{ id: 'label1', name: 'Priority', color: 'red' }],
          members: ['member1', 'member2']
        },
        {
          id: 'card2',
          name: 'Task 2',
          description: '',
          url: 'https://trello.com/c/def456/task-2',
          short_url: 'https://trello.com/c/def456',
          closed: false,
          list_id: 'list2',
          board_id: 'test_board_id',
          due: null,
          due_complete: false,
          date_last_activity: '2023-08-10T09:15:00Z',
          position: 131070,
          labels: [],
          members: []
        }
      ]
    });
    expect(consoleSpy).toHaveBeenCalledWith('Fetch board cards function invoked with request ID: test-request-id');
    expect(consoleSpy).toHaveBeenCalledWith('Successfully fetched 2 cards from board test_board_id');
    expect(TrelloClient).toHaveBeenCalledWith(mockFunctionInput);
  });

  it('should return error when fetching cards fails', async () => {
    // Arrange
    const errorMessage = 'API rate limit exceeded';
    
    // Mock the getBoardCards method to throw an error
    (TrelloClient as jest.Mock).mockImplementation(() => ({
      getBoardCards: jest.fn().mockRejectedValue(new Error(errorMessage))
    }));
    
    const events = [mockFunctionInput];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await fetch_board_cards(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: `Failed to fetch board cards: ${errorMessage}`
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when no events are provided', async () => {
    // Arrange
    const events: FunctionInput[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await fetch_board_cards(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: 'Failed to fetch board cards: No events provided to the function'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when board ID is missing', async () => {
    // Arrange
    const eventWithoutBoardId = {
      ...mockFunctionInput,
      payload: {
        ...mockFunctionInput.payload,
        event_context: {}  // external_sync_unit_id is missing
      }
    };
    
    const events = [eventWithoutBoardId];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await fetch_board_cards(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: 'Failed to fetch board cards: Board ID not found in event context (external_sync_unit_id)'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when limit parameter is missing', async () => {
    // Arrange
    const eventWithoutLimit = {
      ...mockFunctionInput,
      payload: {
        ...mockFunctionInput.payload,
        limit: undefined
      }
    };
    
    const events = [eventWithoutLimit];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await fetch_board_cards(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: 'Failed to fetch board cards: Invalid or missing limit parameter. Limit must be a positive number.'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when limit parameter is invalid', async () => {
    // Arrange
    const eventWithInvalidLimit = {
      ...mockFunctionInput,
      payload: {
        ...mockFunctionInput.payload,
        limit: -10  // negative number
      }
    };
    
    const events = [eventWithInvalidLimit];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await fetch_board_cards(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: 'Failed to fetch board cards: Invalid or missing limit parameter. Limit must be a positive number.'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when before parameter is invalid', async () => {
    // Arrange
    const eventWithInvalidBefore = {
      ...mockFunctionInput,
      payload: {
        ...mockFunctionInput.payload,
        before: 123  // should be a string
      }
    };
    
    const events = [eventWithInvalidBefore];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await fetch_board_cards(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: 'Failed to fetch board cards: Invalid before parameter. Before must be a string if provided.'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should successfully fetch cards with both limit and before parameters', async () => {
    // Arrange
    const mockCards = [
      {
        id: 'card3',
        name: 'Task 3',
        desc: 'Description for task 3',
        url: 'https://trello.com/c/ghi789/task-3',
        shortUrl: 'https://trello.com/c/ghi789',
        closed: false,
        idList: 'list1',
        idBoard: 'test_board_id',
        due: null,
        dueComplete: false,
        dateLastActivity: '2023-08-05T11:20:00Z',
        pos: 196605,
        labels: [],
        idMembers: ['member1']
      }
    ];
    
    // Create a mock function for getBoardCards that can be tracked
    const getBoardCardsMock = jest.fn().mockResolvedValue(mockCards);
    
    // Mock the getBoardCards method to return a successful response
    (TrelloClient as jest.Mock).mockImplementation(() => ({
      getBoardCards: getBoardCardsMock
    }));
    
    const eventWithBefore = {
      ...mockFunctionInput,
      payload: {
        ...mockFunctionInput.payload,
        limit: 50,
        before: 'card2'
      }
    };
    
    const events = [eventWithBefore];

    // Act
    const result = await fetch_board_cards(events);

    // Assert
    expect(result.status).toBe('success');
    expect(result.cards).toHaveLength(1);
    expect(result.cards?.[0].id).toBe('card3');
    
    // Verify the client was called with the correct parameters
    expect(getBoardCardsMock).toHaveBeenCalledWith('test_board_id', 50, 'card2');
  });
});