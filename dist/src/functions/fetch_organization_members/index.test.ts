import { run, FetchOrganizationMembersResult } from './index';
import {
  createMockEvent,
  setupSuccessfulMembersFetch,
  setupFailedMembersFetch,
  setupRateLimitMock,
  MOCK_MEMBERS,
  MockedTrelloClient,
  mockedParseApiCredentials
} from './test-helpers';

// Import the module to ensure mocks are applied
jest.mock('../../core/trello-client');

describe('fetch_organization_members function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.TRELLO_BASE_URL = 'https://api.trello.com/1';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should successfully fetch organization members with valid credentials', async () => {
    const mockEvent = createMockEvent();
    const mockGetOrganizationMembers = setupSuccessfulMembersFetch();

    const result: FetchOrganizationMembersResult = await run([mockEvent]);

    expect(mockedParseApiCredentials).toHaveBeenCalledWith('key=test-api-key&token=test-token');
    expect(MockedTrelloClient).toHaveBeenCalledWith({
      baseUrl: 'https://api.trello.com/1',
      apiKey: 'test-api-key',
      token: 'test-token'
    });
    expect(mockGetOrganizationMembers).toHaveBeenCalledWith('test-org-id');
    expect(result).toEqual({
      success: true,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched 2 organization members',
      raw_response: { status: 200, data: MOCK_MEMBERS },
      members: MOCK_MEMBERS
    });
  });

  it('should handle authentication failure with 401 status', async () => {
    const mockEvent = createMockEvent();
    const mockGetOrganizationMembers = setupFailedMembersFetch(401, 'Authentication failed. Invalid API key or token');

    const result: FetchOrganizationMembersResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 401,
      api_delay: 0,
      message: 'Authentication failed. Invalid API key or token',
      raw_response: { status: 401, headers: {} },
      members: undefined
    });
  });

  it('should handle rate limiting with 429 status', async () => {
    const mockEvent = createMockEvent();
    const mockGetOrganizationMembers = setupRateLimitMock('60');

    const result: FetchOrganizationMembersResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 429,
      api_delay: 60,
      message: 'Rate limit exceeded. Retry after 60 seconds',
      raw_response: { status: 429, headers: { 'retry-after': '60' } },
      members: undefined
    });
  });

  it('should return error when no events are provided', async () => {
    const result: FetchOrganizationMembersResult = await run([]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Fetch organization members failed: No events provided',
      raw_response: null,
      members: undefined
    });
  });

  it('should return error when TRELLO_BASE_URL is not set', async () => {
    delete process.env.TRELLO_BASE_URL;
    const mockEvent = createMockEvent();

    const result: FetchOrganizationMembersResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Fetch organization members failed: TRELLO_BASE_URL environment variable not set',
      raw_response: null,
      members: undefined
    });
  });

  it('should return error when connection data is missing', async () => {
    const mockEvent = createMockEvent({
      payload: {
        connection_data: undefined
      }
    });

    const result: FetchOrganizationMembersResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Fetch organization members failed: Missing connection data or API key',
      raw_response: null,
      members: undefined
    });
  });

  it('should return error when organization ID is missing', async () => {
    const mockEvent = createMockEvent({
      payload: {
        connection_data: {
          key: 'key=test-api-key&token=test-token',
          org_id: undefined
        }
      }
    });

    const result: FetchOrganizationMembersResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Fetch organization members failed: Missing organization ID',
      raw_response: null,
      members: undefined
    });
  });
});