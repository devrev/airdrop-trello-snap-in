import { run } from './index';
import { TrelloClient } from '../../core/trello-client';
import { 
  mockCards, 
  createMockEvent, 
  setupTrelloClientMock, 
  setupTrelloClientParseError 
} from './test-helpers';

// Mock the TrelloClient
jest.mock('../../core/trello-client');

describe('fetch_board_cards function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cards when API call succeeds', async () => {
    const mockGetBoardCards = setupTrelloClientMock({
      data: mockCards,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched board cards from Trello API',
    });

    const result = await run([createMockEvent()]);

    expect(result).toEqual({
      cards: mockCards,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched board cards from Trello API',
    });
    expect(mockGetBoardCards).toHaveBeenCalledWith('test-board-id', 10, undefined);
  });

  it('should pass before parameter when provided', async () => {
    const eventWithBefore = createMockEvent({
      input_data: {
        global_values: {
          limit: '5',
          before: 'card123'
        }
      }
    });

    const mockGetBoardCards = setupTrelloClientMock({
      data: mockCards,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched board cards from Trello API',
    });

    const result = await run([eventWithBefore]);

    expect(mockGetBoardCards).toHaveBeenCalledWith('test-board-id', 5, 'card123');
  });

  it('should handle API call failure with 401', async () => {
    setupTrelloClientMock({
      status_code: 401,
      api_delay: 0,
      message: 'Authentication failed. Invalid API key or token',
    });

    const result = await run([createMockEvent()]);

    expect(result).toEqual({
      status_code: 401,
      api_delay: 0,
      message: 'Authentication failed. Invalid API key or token',
    });
    expect(result.cards).toBeUndefined();
  });

  it('should handle API call failure with 404', async () => {
    setupTrelloClientMock({
      status_code: 404,
      api_delay: 0,
      message: 'Board not found',
    });

    const result = await run([createMockEvent()]);

    expect(result).toEqual({
      status_code: 404,
      api_delay: 0,
      message: 'Board not found',
    });
  });

  it('should handle rate limiting with proper api_delay', async () => {
    setupTrelloClientMock({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded. Retry after 30 seconds',
    });

    const result = await run([createMockEvent()]);

    expect(result).toEqual({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded. Retry after 30 seconds',
    });
  });

  it('should return error when no events are provided', async () => {
    const result = await run([]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch board cards failed: No events provided',
    });
  });

  it('should return error when connection data is missing', async () => {
    const eventWithoutConnectionData = {
      ...createMockEvent(),
      payload: {
        event_context: createMockEvent().payload.event_context
      }
    };

    const result = await run([eventWithoutConnectionData]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch board cards failed: Missing connection data',
    });
  });

  it('should return error when board ID is missing', async () => {
    const eventWithoutBoardId = {
      ...createMockEvent(),
      payload: {
        ...createMockEvent().payload,
        event_context: {
          ...createMockEvent().payload.event_context,
          external_sync_unit_id: undefined
        }
      }
    };

    const result = await run([eventWithoutBoardId]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch board cards failed: Missing board ID',
    });
  });

  it('should return error when limit parameter is missing', async () => {
    const eventWithoutLimit = createMockEvent({
      input_data: {
        global_values: {}
      }
    });

    const result = await run([eventWithoutLimit]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch board cards failed: Missing required limit parameter',
    });
  });

  it('should return error when limit parameter is invalid', async () => {
    const eventWithInvalidLimit = createMockEvent({
      input_data: {
        global_values: {
          limit: 'invalid'
        }
      }
    });

    const result = await run([eventWithInvalidLimit]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch board cards failed: Invalid limit parameter',
    });
  });

  it('should return error when limit parameter is zero', async () => {
    const eventWithZeroLimit = createMockEvent({
      input_data: {
        global_values: {
          limit: '0'
        }
      }
    });

    const result = await run([eventWithZeroLimit]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch board cards failed: Invalid limit parameter',
    });
  });

  it('should return error when credentials parsing fails', async () => {
    setupTrelloClientParseError('Invalid connection data: missing API key or token');

    const eventWithInvalidKey = createMockEvent({
      payload: {
        connection_data: {
          key: 'invalid-format'
        }
      }
    });

    const result = await run([eventWithInvalidKey]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch board cards failed: Invalid connection data: missing API key or token',
    });
  });

  it('should handle undefined events array', async () => {
    // @ts-ignore - Testing invalid input
    const result = await run(undefined);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch board cards failed: No events provided',
    });
  });

  it('should handle network errors', async () => {
    setupTrelloClientMock({
      status_code: 0,
      api_delay: 0,
      message: 'Network error: Unable to reach Trello API',
    });

    const result = await run([createMockEvent()]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Network error: Unable to reach Trello API',
    });
  });
});