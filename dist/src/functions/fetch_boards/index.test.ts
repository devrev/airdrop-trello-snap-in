import { run } from './index';
import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

// Mock the TrelloClient
jest.mock('../../core/trello-client');

describe('fetch_boards function', () => {
  const mockEvent: FunctionInput = {
    payload: {
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'test-org-name',
        key: 'key=test-api-key&token=test-token',
        key_type: 'test-key-type'
      }
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
      function_name: 'fetch_boards',
      event_type: 'test-event-type',
      devrev_endpoint: 'https://api.devrev.ai'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  const mockBoards = [
    {
      id: 'board1',
      name: 'Test Board 1',
      desc: 'Test description 1',
      closed: false
    },
    {
      id: 'board2',
      name: 'Test Board 2',
      desc: 'Test description 2',
      closed: false
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return boards when API call succeeds', async () => {
    // Mock the static parseCredentials method
    const parseCredentialsSpy = jest.spyOn(TrelloClient, 'parseCredentials').mockReturnValue({
      apiKey: 'test-api-key',
      token: 'test-token',
    });

    const mockGetBoardsForMember = jest.fn().mockResolvedValue({
      data: mockBoards,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched boards from Trello API',
    });

    // Mock the constructor
    (TrelloClient as jest.MockedClass<typeof TrelloClient>).mockImplementation(() => ({
      getBoardsForMember: mockGetBoardsForMember,
    } as any));

    const result = await run([mockEvent]);

    expect(result).toEqual({
      boards: mockBoards,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched boards from Trello API',
    });
    expect(mockGetBoardsForMember).toHaveBeenCalledWith('me');
  });

  it('should handle API call failure with 401', async () => {
    // Mock the static parseCredentials method
    const parseCredentialsSpy = jest.spyOn(TrelloClient, 'parseCredentials').mockReturnValue({
      apiKey: 'invalid-key',
      token: 'invalid-token',
    });

    const mockGetBoardsForMember = jest.fn().mockResolvedValue({
      status_code: 401,
      api_delay: 0,
      message: 'Authentication failed. Invalid API key or token',
    });

    // Mock the constructor
    (TrelloClient as jest.MockedClass<typeof TrelloClient>).mockImplementation(() => ({
      getBoardsForMember: mockGetBoardsForMember,
    } as any));

    const result = await run([mockEvent]);

    expect(result).toEqual({
      status_code: 401,
      api_delay: 0,
      message: 'Authentication failed. Invalid API key or token',
    });
    expect(result.boards).toBeUndefined();
  });

  it('should handle rate limiting with proper api_delay', async () => {
    // Mock the static parseCredentials method
    const parseCredentialsSpy = jest.spyOn(TrelloClient, 'parseCredentials').mockReturnValue({
      apiKey: 'test-api-key',
      token: 'test-token',
    });

    const mockGetBoardsForMember = jest.fn().mockResolvedValue({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded. Retry after 30 seconds',
    });

    // Mock the constructor
    (TrelloClient as jest.MockedClass<typeof TrelloClient>).mockImplementation(() => ({
      getBoardsForMember: mockGetBoardsForMember,
    } as any));

    const result = await run([mockEvent]);

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
      message: 'Fetch boards failed: No events provided',
    });
  });

  it('should return error when connection data is missing', async () => {
    const eventWithoutConnectionData = {
      ...mockEvent,
      payload: {}
    };

    const result = await run([eventWithoutConnectionData]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch boards failed: Missing connection data',
    });
  });

  it('should return error when credentials parsing fails', async () => {
    const eventWithInvalidKey = {
      ...mockEvent,
      payload: {
        connection_data: {
          key: 'invalid-format'
        }
      }
    };

    jest.spyOn(TrelloClient, 'parseCredentials').mockImplementation(() => {
      throw new Error('Invalid connection data: missing API key or token');
    });

    const result = await run([eventWithInvalidKey]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch boards failed: Invalid connection data: missing API key or token',
    });
  });

  it('should handle undefined events array', async () => {
    // @ts-ignore - Testing invalid input
    const result = await run(undefined);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Fetch boards failed: No events provided',
    });
  });

  it('should handle network errors', async () => {
    // Mock the static parseCredentials method
    const parseCredentialsSpy = jest.spyOn(TrelloClient, 'parseCredentials').mockReturnValue({
      apiKey: 'test-api-key',
      token: 'test-token',
    });

    const mockGetBoardsForMember = jest.fn().mockResolvedValue({
      status_code: 0,
      api_delay: 0,
      message: 'Network error: Unable to reach Trello API',
    });

    // Mock the constructor
    (TrelloClient as jest.MockedClass<typeof TrelloClient>).mockImplementation(() => ({
      getBoardsForMember: mockGetBoardsForMember,
    } as any));

    const result = await run([mockEvent]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Network error: Unable to reach Trello API',
    });
  });
});