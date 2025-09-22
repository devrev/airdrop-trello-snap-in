import { run, FetchBoardsResult } from './index';
import {
  createMockEvent,
  setupSuccessfulBoardsFetch,
  setupFailedBoardsFetch,
  setupRateLimitMock,
  MOCK_BOARDS,
  MockedTrelloClient,
  mockedParseApiCredentials
} from './test-helpers';

// Import the module to ensure mocks are applied
jest.mock('../../core/trello-client');

describe('fetch_boards function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.TRELLO_BASE_URL = 'https://api.trello.com/1';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should successfully fetch boards with valid credentials', async () => {
    const mockEvent = createMockEvent();
    const mockGetMemberBoards = setupSuccessfulBoardsFetch();

    const result: FetchBoardsResult = await run([mockEvent]);

    expect(mockedParseApiCredentials).toHaveBeenCalledWith('key=test-api-key&token=test-token');
    expect(MockedTrelloClient).toHaveBeenCalledWith({
      baseUrl: 'https://api.trello.com/1',
      apiKey: 'test-api-key',
      token: 'test-token'
    });
    expect(mockGetMemberBoards).toHaveBeenCalledWith('me');
    expect(result).toEqual({
      success: true,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched 2 boards',
      raw_response: { status: 200, data: MOCK_BOARDS },
      boards: MOCK_BOARDS
    });
  });

  it('should handle authentication failure with 401 status', async () => {
    const mockEvent = createMockEvent();
    const mockGetMemberBoards = setupFailedBoardsFetch(401, 'Authentication failed. Invalid API key or token');

    const result: FetchBoardsResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 401,
      api_delay: 0,
      message: 'Authentication failed. Invalid API key or token',
      raw_response: { status: 401, headers: {} },
      boards: undefined
    });
  });

  it('should handle rate limiting with 429 status', async () => {
    const mockEvent = createMockEvent();
    const mockGetMemberBoards = setupRateLimitMock('60');

    const result: FetchBoardsResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 429,
      api_delay: 60,
      message: 'Rate limit exceeded. Retry after 60 seconds',
      raw_response: { status: 429, headers: { 'retry-after': '60' } },
      boards: undefined
    });
  });

  it('should return error when no events are provided', async () => {
    const result: FetchBoardsResult = await run([]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Fetch boards failed: No events provided',
      raw_response: null,
      boards: undefined
    });
  });

  it('should return error when TRELLO_BASE_URL is not set', async () => {
    delete process.env.TRELLO_BASE_URL;
    const mockEvent = createMockEvent();

    const result: FetchBoardsResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Fetch boards failed: TRELLO_BASE_URL environment variable not set',
      raw_response: null,
      boards: undefined
    });
  });

  it('should return error when connection data is missing', async () => {
    const mockEvent = createMockEvent({
      payload: {
        connection_data: undefined
      }
    });

    const result: FetchBoardsResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Fetch boards failed: Missing connection data or API key',
      raw_response: null,
      boards: undefined
    });
  });
});