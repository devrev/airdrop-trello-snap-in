import { get_organization_members } from './index';
import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello_client';

// Mock the TrelloClient
jest.mock('../../core/trello_client');

describe('get_organization_members function', () => {
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
      function_name: 'get_organization_members',
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

  it('should return success with members when fetching is successful', async () => {
    // Arrange
    const mockMembers = [
      {
        id: 'member1',
        username: 'johndoe',
        fullName: 'John Doe',
        email: 'john@example.com',
        lastActive: '2023-08-15T14:30:00Z'
      },
      {
        id: 'member2',
        username: 'janesmith',
        fullName: 'Jane Smith',
        email: 'jane@example.com',
        lastActive: '2023-08-10T09:15:00Z'
      }
    ];
    
    // Mock the getOrganizationMembers method to return a successful response
    (TrelloClient as jest.Mock).mockImplementation(() => ({
      getOrganizationMembers: jest.fn().mockResolvedValue(mockMembers)
    }));
    
    const events = [mockFunctionInput];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await get_organization_members(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Successfully fetched 2 members from organization',
      members: [
        {
          id: 'member1',
          username: 'johndoe',
          full_name: 'John Doe',
          email: 'john@example.com',
          last_active: '2023-08-15T14:30:00Z'
        },
        {
          id: 'member2',
          username: 'janesmith',
          full_name: 'Jane Smith',
          email: 'jane@example.com',
          last_active: '2023-08-10T09:15:00Z'
        }
      ]
    });
    expect(consoleSpy).toHaveBeenCalledWith('Get organization members function invoked with request ID: test-request-id');
    expect(consoleSpy).toHaveBeenCalledWith('Successfully fetched 2 members from organization test_org_id');
    expect(TrelloClient).toHaveBeenCalledWith(mockFunctionInput);
  });

  it('should return error when fetching members fails', async () => {
    // Arrange
    const errorMessage = 'API rate limit exceeded';
    
    // Mock the getOrganizationMembers method to throw an error
    (TrelloClient as jest.Mock).mockImplementation(() => ({
      getOrganizationMembers: jest.fn().mockRejectedValue(new Error(errorMessage))
    }));
    
    const events = [mockFunctionInput];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await get_organization_members(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: `Failed to fetch organization members: ${errorMessage}`
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when no events are provided', async () => {
    // Arrange
    const events: FunctionInput[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await get_organization_members(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: 'Failed to fetch organization members: No events provided to the function'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when organization ID is missing', async () => {
    // Arrange
    const eventWithoutOrgId = {
      ...mockFunctionInput,
      payload: {
        ...mockFunctionInput.payload,
        connection_data: {
          key: 'key=test_api_key&token=test_token'
          // org_id is missing
        }
      }
    };
    
    const events = [eventWithoutOrgId];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await get_organization_members(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: 'Failed to fetch organization members: Organization ID not found in connection data'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});