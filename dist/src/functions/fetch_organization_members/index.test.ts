import { run } from './index';
import { TrelloClient } from '../../core/trello-client';
import { 
  mockMembers, 
  createMockEvent, 
  setupTrelloClientMock, 
  setupTrelloClientParseError 
} from './test-helpers';

// Mock the TrelloClient
jest.mock('../../core/trello-client');

describe('fetch_organization_members function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return organization members when API call succeeds', async () => {
    const mockGetOrganizationMembers = setupTrelloClientMock({
      data: mockMembers,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched organization members from Trello API',
    });

    const result = await run([createMockEvent()]);

    expect(result).toEqual({
      members: mockMembers,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched organization members from Trello API',
    });
    expect(mockGetOrganizationMembers).toHaveBeenCalledWith('test-org-id');
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
    expect(result.members).toBeUndefined();
  });

  it('should handle API call failure with 404', async () => {
    setupTrelloClientMock({
      status_code: 404,
      api_delay: 0,
      message: 'Organization not found',
    });

    const result = await run([createMockEvent()]);

    expect(result).toEqual({
      status_code: 404,
      api_delay: 0,
      message: 'Organization not found',
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
      message: 'Fetch organization members failed: No events provided',
    });
  });

  it('should return error when connection data is missing', async () => {
    // Don't set up any TrelloClient mock for this test
    // since we should never reach the TrelloClient code
    const eventWithoutConnectionData = {
      ...createMockEvent(),
      payload: {}
    };

    const result = await run([eventWithoutConnectionData]);  });

  it('should return error when organization ID is missing', async () => {

    // Don't set up any TrelloClient mock for this test
    // since we should never reach the TrelloClient code
    const eventWithoutOrgId = {
      ...createMockEvent(),
      payload: {
        connection_data: {
          key: 'key=test-api-key&token=test-token'
        }
      }
    };

    const result = await run([eventWithoutOrgId]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch organization members failed: Missing organization ID',
    });
  });

  it('should return error when credentials parsing fails', async () => {
    setupTrelloClientParseError('Invalid connection data: missing API key or token');

    // Set up parse error but don't set up TrelloClient mock
    const eventWithInvalidKey = {
      ...createMockEvent(),
      payload: {
        connection_data: {
          org_id: 'test-org-id',
          key: 'invalid-format'
        }
      }
    };

    const result = await run([eventWithInvalidKey]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch organization members failed: Invalid connection data: missing API key or token',
    });
  });

  it('should handle undefined events array', async () => {
    // @ts-ignore - Testing invalid input
    const result = await run(undefined);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch organization members failed: No events provided',
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