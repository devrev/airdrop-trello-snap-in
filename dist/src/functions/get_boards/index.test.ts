import { get_boards } from './index';
import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello_client';

// Mock the TrelloClient
jest.mock('../../core/trello_client');

describe('get_boards function', () => {
  // Mock function input
  const mockFunctionInput: FunctionInput = {
    payload: {
      connection_data: {
        key: 'key=test_api_key&token=test_token',
        org_id: 'test_org_id',
        org_name: 'Test Organization'
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
      function_name: 'get_boards',
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

  it('should return success with boards when fetching is successful', async () => {
    // Arrange
    const mockBoards = [
      {
        id: 'board1',
        name: 'Project Alpha',
        desc: 'Main project board',
        url: 'https://trello.com/b/abc123/project-alpha',
        closed: false,
        idOrganization: 'org1',
        dateLastActivity: '2023-08-15T14:30:00Z'
      },
      {
        id: 'board2',
        name: 'Project Beta',
        desc: '',
        url: 'https://trello.com/b/def456/project-beta',
        closed: false,
        idOrganization: 'org1',
        dateLastActivity: '2023-08-10T09:15:00Z'
      }
    ];
    
    // Mock the getBoards method to return a successful response
    (TrelloClient as jest.Mock).mockImplementation(() => ({
      getBoards: jest.fn().mockResolvedValue(mockBoards)
    }));
    
    const events = [mockFunctionInput];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await get_boards(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Successfully fetched 2 boards',
      boards: [
        {
          id: 'board1',
          name: 'Project Alpha',
          description: 'Main project board',
          url: 'https://trello.com/b/abc123/project-alpha',
          closed: false,
          organization_id: 'org1',
          last_activity_date: '2023-08-15T14:30:00Z'
        },
        {
          id: 'board2',
          name: 'Project Beta',
          description: '',
          url: 'https://trello.com/b/def456/project-beta',
          closed: false,
          organization_id: 'org1',
          last_activity_date: '2023-08-10T09:15:00Z'
        }
      ]
    });
    expect(consoleSpy).toHaveBeenCalledWith('Get boards function invoked with request ID: test-request-id');
    expect(consoleSpy).toHaveBeenCalledWith('Successfully fetched 2 boards');
    expect(TrelloClient).toHaveBeenCalledWith(mockFunctionInput);
  });

  it('should return error when fetching boards fails', async () => {
    // Arrange
    const errorMessage = 'API rate limit exceeded';
    
    // Mock the getBoards method to throw an error
    (TrelloClient as jest.Mock).mockImplementation(() => ({
      getBoards: jest.fn().mockRejectedValue(new Error(errorMessage))
    }));
    
    const events = [mockFunctionInput];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await get_boards(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: `Failed to fetch boards: ${errorMessage}`
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when no events are provided', async () => {
    // Arrange
    const events: FunctionInput[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await get_boards(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: 'Failed to fetch boards: No events provided to the function'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});