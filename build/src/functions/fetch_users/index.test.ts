import axios from 'axios';
import { EventType } from '@devrev/ts-adaas';
import { handler } from './index';
import { createMockEvent, createMockPayload } from './test-utils';
import { setupTest, createMockUsers, createExpectedUsers } from './test-helpers';

describe('fetch_users function', () => {
  // Test utilities
  let testUtils: ReturnType<typeof setupTest>;

  beforeEach(() => {
    // Setup test environment before each test
    testUtils = setupTest();
  });

  afterEach(() => {
    // Clean up after each test
    testUtils.cleanup();
  });

  it('should return users when API call is successful', async () => {
    // Create mock users
    const mockUsers = createMockUsers();
    
    // Mock successful API response
    testUtils.mockSuccessfulResponse(mockUsers);
    
    const mockEvent = testUtils.createTestEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: true,
      message: 'Successfully fetched 2 users from Trello organization',
      users: createExpectedUsers(mockUsers)
    });

    // Verify axios was called with the correct parameters
    expect(testUtils.axiosGetSpy).toHaveBeenCalledWith(
      'https://api.trello.com/1/organizations/mock-org-id/members',
      expect.objectContaining({
        params: {
          key: 'test-api-key',
          token: 'test-token',
          fields: 'username,fullName,initials,email,avatarUrl,bio,url'
        },
        timeout: 10000
      })
    );
  });

  it('should return empty users array when API returns no users', async () => {
    // Mock empty API response
    testUtils.mockEmptyResponse();
    
    const mockEvent = testUtils.createTestEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: true,
      message: 'Successfully fetched 0 users from Trello organization',
      users: []
    });
  });

  it('should return error when API call fails', async () => {
    // Mock failed API response
    testUtils.mockFailedResponse(401, 'Unauthorized', { message: 'Invalid token' });
    
    const mockEvent = testUtils.createTestEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Failed to fetch users with status 401: Unauthorized',
      error: {
        status: 401,
        data: { message: 'Invalid token' }
      }
    });
  });

  it('should return error when no response is received', async () => {
    // Mock network error
    testUtils.mockNetworkError();
    
    const mockEvent = testUtils.createTestEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Failed to fetch users: Network Error',
      error: {}
    });
  });

  it('should return error when connection data is missing', async () => {
    const mockEvent = testUtils.createTestEvent();
    // Remove connection data from the payload
    mockEvent.payload.connection_data = undefined as any;

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Missing connection data in payload'
    });

    // Verify axios get was not called
    expect(testUtils.axiosGetSpy).not.toHaveBeenCalled();
  });

  it('should return error when key is missing in connection data', async () => {
    const mockEvent = testUtils.createTestEvent();
    // Create a new connection data object without the key property
    const { key, ...connectionDataWithoutKey } = mockEvent.payload.connection_data;
    
    // Replace the original connection data with the new one that doesn't have key
    mockEvent.payload.connection_data = ({
      ...connectionDataWithoutKey
    } as any);

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Missing key in connection data'
    });

    // Verify axios get was not called
    expect(testUtils.axiosGetSpy).not.toHaveBeenCalled();
  });

  it('should return error when organization ID is missing in connection data', async () => {
    const mockEvent = testUtils.createTestEvent();
    // Create a new connection data object without the org_id property
    const { org_id, ...connectionDataWithoutOrgId } = mockEvent.payload.connection_data;
    
    // Replace the original connection data with the new one that doesn't have org_id
    mockEvent.payload.connection_data = ({
      ...connectionDataWithoutOrgId
    } as any);

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Missing organization ID in connection data'
    });

    // Verify axios get was not called
    expect(testUtils.axiosGetSpy).not.toHaveBeenCalled();
  });

  it('should return error when key format is invalid', async () => {
    const mockEvent = testUtils.createTestEvent();
    // Set invalid key format
    mockEvent.payload.connection_data.key = 'invalid-format';

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Failed to fetch users: Failed to extract credentials: Invalid key format. Expected format: "key=<api_key>&token=<token>"',
      error: {}
    });

    // Verify axios get was not called
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('should throw error when no events are provided', async () => {
    // Call the handler function with an empty array
    await expect(handler([])).rejects.toThrow('No events provided');
    
    // Verify axios get was not called
    expect(axios.get).not.toHaveBeenCalled();
  });
});