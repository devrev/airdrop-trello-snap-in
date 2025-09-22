import { run, FetchBoardCardsResult } from './index';
import {
  createMockEvent,
  setupSuccessfulCardsFetch,
  setupFailedCardsFetch,
  setupRateLimitMock,
  MOCK_CARDS,
  MockedTrelloClient,
  mockedParseApiCredentials
} from './test-helpers';

// Import the module to ensure mocks are applied
jest.mock('../../core/trello-client');

describe('fetch_board_cards function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.TRELLO_BASE_URL = 'https://api.trello.com/1';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should successfully fetch cards with valid parameters', async () => {
    const mockEvent = createMockEvent();
    const mockGetBoardCards = setupSuccessfulCardsFetch();

    const result: FetchBoardCardsResult = await run([mockEvent]);

    expect(mockedParseApiCredentials).toHaveBeenCalledWith('key=test-api-key&token=test-token');
    expect(MockedTrelloClient).toHaveBeenCalledWith({
      baseUrl: 'https://api.trello.com/1',
      apiKey: 'test-api-key',
      token: 'test-token'
    });
    expect(mockGetBoardCards).toHaveBeenCalledWith('board1', {
      limit: 100,
      before: 'card123'
    });
    expect(result).toEqual({
      success: true,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched 2 cards from board',
      raw_response: { status: 200, data: MOCK_CARDS },
      cards: MOCK_CARDS
    });
  });

  it('should handle authentication failure with 401 status', async () => {
    const mockEvent = createMockEvent();
    const mockGetBoardCards = setupFailedCardsFetch(401, 'Authentication failed. Invalid API key or token');

    const result: FetchBoardCardsResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 401,
      api_delay: 0,
      message: 'Authentication failed. Invalid API key or token',
      raw_response: { status: 401, headers: {} },
      cards: undefined
    });
  });

  it('should handle rate limiting with 429 status', async () => {
    const mockEvent = createMockEvent();
    const mockGetBoardCards = setupRateLimitMock('60');

    const result: FetchBoardCardsResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 429,
      api_delay: 60,
      message: 'Rate limit exceeded. Retry after 60 seconds',
      raw_response: { status: 429, headers: { 'retry-after': '60' } },
      cards: undefined
    });
  });

  it('should return error when no events are provided', async () => {
    const result: FetchBoardCardsResult = await run([]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Fetch board cards failed: No events provided',
      raw_response: null,
      cards: undefined
    });
  });

  it('should return error when TRELLO_BASE_URL is not set', async () => {
    delete process.env.TRELLO_BASE_URL;
    const mockEvent = createMockEvent();

    const result: FetchBoardCardsResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Fetch board cards failed: TRELLO_BASE_URL environment variable not set',
      raw_response: null,
      cards: undefined
    });
  });

  it('should return error when connection data is missing', async () => {
    const mockEvent = createMockEvent({
      payload: {
        connection_data: undefined
      }
    });

    const result: FetchBoardCardsResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Fetch board cards failed: Missing connection data or API key',
      raw_response: null,
      cards: undefined
    });
  });

  it('should return error when board ID is missing', async () => {
    const mockEvent = createMockEvent({
      payload: {
        event_context: {
          external_sync_unit_id: undefined
        }
      }
    });

    const result: FetchBoardCardsResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Fetch board cards failed: Missing board ID (external_sync_unit_id)',
      raw_response: null,
      cards: undefined
    });
  });

  it('should return error when limit parameter is missing', async () => {
    const mockEvent = createMockEvent({
      input_data: {
        global_values: {
          limit: '',
          before: 'card123'
        },
        event_sources: {}
      }
    });

    const result: FetchBoardCardsResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Fetch board cards failed: Missing or invalid limit parameter',
      raw_response: null,
      cards: undefined
    });
  });

  it('should handle request with only limit parameter (no before)', async () => {
    const mockEvent = createMockEvent({
      input_data: {
        global_values: {
          limit: '50',
          before: ''
        },
        event_sources: {}
      }
    });
    
    const mockGetBoardCards = setupSuccessfulCardsFetch();

    const result: FetchBoardCardsResult = await run([mockEvent]);

    expect(mockGetBoardCards).toHaveBeenCalledWith('board1', {
      limit: 50,
      before: ''
    });
    expect(result.success).toBe(true);
  });
});