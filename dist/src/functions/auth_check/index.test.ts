import { auth_check } from './index';
import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello_client';

// Mock the TrelloClient
jest.mock('../../core/trello_client');

describe('auth_check function', () => {
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
      function_name: 'auth_check',
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

  it('should return success when authentication is successful', async () => {
    // Arrange
    const mockMember = {
      id: 'user123',
      username: 'testuser',
      fullName: 'Test User',
      email: 'test@example.com'
    };
    
    // Mock the getCurrentMember method to return a successful response
    (TrelloClient as jest.Mock).mockImplementation(() => ({
      getCurrentMember: jest.fn().mockResolvedValue(mockMember)
    }));
    
    const events = [mockFunctionInput];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await auth_check(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Authentication with Trello API successful',
      user: {
        id: 'user123',
        username: 'testuser',
        full_name: 'Test User',
        email: 'test@example.com'
      }
    });
    expect(consoleSpy).toHaveBeenCalledWith('Auth check function invoked with request ID: test-request-id');
    expect(consoleSpy).toHaveBeenCalledWith('Authentication successful for user: testuser');
    expect(TrelloClient).toHaveBeenCalledWith(mockFunctionInput);
  });

  it('should return error when authentication fails', async () => {
    // Arrange
    const errorMessage = 'Invalid API key';
    
    // Mock the getCurrentMember method to throw an error
    (TrelloClient as jest.Mock).mockImplementation(() => ({
      getCurrentMember: jest.fn().mockRejectedValue(new Error(errorMessage))
    }));
    
    const events = [mockFunctionInput];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await auth_check(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: `Authentication failed: ${errorMessage}`
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should throw an error when no events are provided', async () => {
    // Arrange
    const events: FunctionInput[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await auth_check(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: 'Authentication failed: No events provided to the function'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});