import { AuthenticationCheckResult } from './index';
import { run } from './index';
import {
  createMockEvent,
  setupSuccessfulAuthMock,
  setupFailedAuthMock,
  setupRateLimitMock,
  setupParseCredentialsError,
  MOCK_MEMBER_DATA,
  MOCK_MEMBER_DATA_NO_FULLNAME,
  MockedTrelloClient,
  mockedParseApiCredentials
} from './test-helpers';

// Import the module to ensure mocks are applied
jest.mock('../../core/trello-client');

describe('check_authentication function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.TRELLO_BASE_URL = 'https://api.trello.com/1';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should successfully authenticate with valid credentials', async () => {
    const mockEvent = createMockEvent();
    const mockGetMember = setupSuccessfulAuthMock();

    const result: AuthenticationCheckResult = await run([mockEvent]);

    expect(mockedParseApiCredentials).toHaveBeenCalledWith('key=test-api-key&token=test-token');
    expect(MockedTrelloClient).toHaveBeenCalledWith({
      baseUrl: 'https://api.trello.com/1',
      apiKey: 'test-api-key',
      token: 'test-token'
    });
    expect(mockGetMember).toHaveBeenCalledWith('me');
    expect(result).toEqual({
      authenticated: true,
      status_code: 200,
      api_delay: 0,
      message: 'Authentication successful. User: Test User',
      raw_response: { status: 200, data: MOCK_MEMBER_DATA },
      member_info: MOCK_MEMBER_DATA
    });
  });

  it('should handle authentication failure with 401 status', async () => {
    const mockEvent = createMockEvent();
    const mockGetMember = setupFailedAuthMock(401, 'Authentication failed. Invalid API key or token');

    const result: AuthenticationCheckResult = await run([mockEvent]);

    expect(result).toEqual({
      authenticated: false,
      status_code: 401,
      api_delay: 0,
      message: 'Authentication failed. Invalid API key or token',
      raw_response: { status: 401, headers: {} },
      member_info: undefined
    });
  });

  it('should handle rate limiting with 429 status', async () => {
    const mockEvent = createMockEvent();
    const mockGetMember = setupRateLimitMock('60');

    const result: AuthenticationCheckResult = await run([mockEvent]);

    expect(result).toEqual({
      authenticated: false,
      status_code: 429,
      api_delay: 60,
      message: 'Rate limit exceeded. Retry after 60 seconds',
      raw_response: { status: 429, headers: { 'retry-after': '60' } },
      member_info: undefined
    });
  });

  it('should return error when no events are provided', async () => {
    const result: AuthenticationCheckResult = await run([]);

    expect(result).toEqual({
      authenticated: false,
      status_code: 0,
      api_delay: 0,
      message: 'Authentication check failed: No events provided',
      raw_response: null
    });
  });

  it('should return error when TRELLO_BASE_URL is not set', async () => {
    delete process.env.TRELLO_BASE_URL;
    const mockEvent = createMockEvent();

    const result: AuthenticationCheckResult = await run([mockEvent]);

    expect(result).toEqual({
      authenticated: false,
      status_code: 0,
      api_delay: 0,
      message: 'Authentication check failed: TRELLO_BASE_URL environment variable not set',
      raw_response: null
    });
  });

  it('should return error when connection data is missing', async () => {
    const mockEvent = createMockEvent({
      payload: {
        connection_data: undefined
      }
    });

    const result: AuthenticationCheckResult = await run([mockEvent]);

    expect(result).toEqual({
      authenticated: false,
      status_code: 0,
      api_delay: 0,
      message: 'Authentication check failed: Missing connection data or API key',
      raw_response: null
    });
  });

  it('should return error when API key parsing fails', async () => {
    const mockEvent = createMockEvent();
    setupParseCredentialsError('Invalid connection key format');

    const result: AuthenticationCheckResult = await run([mockEvent]);

    expect(result).toEqual({
      authenticated: false,
      status_code: 0,
      api_delay: 0,
      message: 'Authentication check failed: Invalid connection key format',
      raw_response: null
    });
  });

  it('should handle member data without fullName', async () => {
    const mockEvent = createMockEvent();
    const mockGetMember = setupSuccessfulAuthMock(MOCK_MEMBER_DATA_NO_FULLNAME);

    const result: AuthenticationCheckResult = await run([mockEvent]);

    expect(result.message).toBe('Authentication successful. User: testuser');
  });
});