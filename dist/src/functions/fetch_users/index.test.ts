import run from './index';
import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

// Mock the TrelloClient
jest.mock('../../core/trello-client', () => {
  const mockGetOrganizationMembers = jest.fn();
  const mockGetMemberDetails = jest.fn();
  const mockTrelloClient = jest.fn().mockImplementation(() => ({
    getOrganizationMembers: mockGetOrganizationMembers,
    getMemberDetails: mockGetMemberDetails,
  }));

  return {
    TrelloClient: mockTrelloClient,
    parseConnectionData: jest.requireActual('../../core/trello-client').parseConnectionData,
    __mockGetOrganizationMembers: mockGetOrganizationMembers,
    __mockGetMemberDetails: mockGetMemberDetails,
  };
});

describe('fetch_users function', () => {
  const createMockEvent = (overrides?: Partial<FunctionInput>): FunctionInput => ({
    payload: {
      connection_data: {
        key: 'key=test-api-key&token=test-token',
        org_id: 'test-org-id',
      },
    },
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token',
      },
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: 'fetch_users',
      event_type: 'test-event',
      devrev_endpoint: 'https://api.devrev.ai/',
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const { __mockGetOrganizationMembers, __mockGetMemberDetails } = require('../../core/trello-client');
    __mockGetOrganizationMembers.mockReset();
    __mockGetMemberDetails.mockReset();
  });

  it('should successfully fetch users', async () => {
    const mockMembers = [
      {
        id: 'user-1',
        fullName: 'John Doe',
        username: 'johndoe',
      },
      {
        id: 'user-2',
        fullName: 'Jane Smith',
        username: 'janesmith',
      },
    ];

    const { __mockGetOrganizationMembers, __mockGetMemberDetails } = require('../../core/trello-client');
    
    __mockGetOrganizationMembers.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched members',
      data: mockMembers,
    });

    __mockGetMemberDetails
      .mockResolvedValueOnce({
        status_code: 200,
        api_delay: 0,
        message: 'Successfully fetched member details',
        data: { email: 'john@example.com' },
      })
      .mockResolvedValueOnce({
        status_code: 200,
        api_delay: 0,
        message: 'Successfully fetched member details',
        data: { email: 'jane@example.com' },
      });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result).toEqual({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched 2 users',
      data: [
        {
          id: 'user-1',
          full_name: 'John Doe',
          username: 'johndoe',
          email: 'john@example.com',
        },
        {
          id: 'user-2',
          full_name: 'Jane Smith',
          username: 'janesmith',
          email: 'jane@example.com',
        },
      ],
    });
  });

  it('should handle users with missing email', async () => {
    const mockMembers = [
      {
        id: 'user-1',
        fullName: 'John Doe',
        username: 'johndoe',
      },
    ];

    const { __mockGetOrganizationMembers, __mockGetMemberDetails } = require('../../core/trello-client');
    
    __mockGetOrganizationMembers.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched members',
      data: mockMembers,
    });

    __mockGetMemberDetails.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched member details',
      data: {},
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result.data).toBeDefined();
    expect(result.data![0].email).toBe('');
  });

  it('should handle rate limiting on organization members fetch', async () => {
    const { __mockGetOrganizationMembers } = require('../../core/trello-client');
    
    __mockGetOrganizationMembers.mockResolvedValue({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded',
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result).toEqual({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded',
    });
  });

  it('should handle rate limiting on member details fetch', async () => {
    const mockMembers = [
      {
        id: 'user-1',
        fullName: 'John Doe',
        username: 'johndoe',
      },
      {
        id: 'user-2',
        fullName: 'Jane Smith',
        username: 'janesmith',
      },
    ];

    const { __mockGetOrganizationMembers, __mockGetMemberDetails } = require('../../core/trello-client');
    
    __mockGetOrganizationMembers.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched members',
      data: mockMembers,
    });

    __mockGetMemberDetails
      .mockResolvedValueOnce({
        status_code: 200,
        api_delay: 0,
        message: 'Successfully fetched member details',
        data: { email: 'john@example.com' },
      })
      .mockResolvedValueOnce({
        status_code: 429,
        api_delay: 15,
        message: 'Rate limit exceeded',
      });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result).toEqual({
      status_code: 429,
      api_delay: 15,
      message: 'Rate limit exceeded',
    });
  });

  it('should handle API errors on organization members fetch', async () => {
    const { __mockGetOrganizationMembers } = require('../../core/trello-client');
    
    __mockGetOrganizationMembers.mockResolvedValue({
      status_code: 500,
      api_delay: 0,
      message: 'Internal server error',
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result).toEqual({
      status_code: 500,
      api_delay: 0,
      message: 'Internal server error',
    });
  });

  it('should handle empty events array', async () => {
    const result = await run([]);

    expect(result).toEqual({
      status_code: 400,
      api_delay: 0,
      message: 'No events to process',
    });
  });

  it('should throw error for missing connection data', async () => {
    const mockEvent = createMockEvent({
      payload: {},
    });

    await expect(run([mockEvent])).rejects.toThrow(
      'Invalid event structure: missing connection_data'
    );
  });

  it('should throw error for missing connection data key', async () => {
    const mockEvent = createMockEvent({
      payload: {
        connection_data: {
          org_id: 'test-org-id',
        },
      },
    });

    await expect(run([mockEvent])).rejects.toThrow('Missing connection data key');
  });

  it('should throw error for missing organization ID', async () => {
    const mockEvent = createMockEvent({
      payload: {
        connection_data: {
          key: 'key=test-api-key&token=test-token',
        },
      },
    });

    await expect(run([mockEvent])).rejects.toThrow('Missing organization ID');
  });

  it('should process only the first event', async () => {
    const mockMembers = [
      {
        id: 'user-1',
        fullName: 'John Doe',
        username: 'johndoe',
      },
    ];

    const { __mockGetOrganizationMembers, __mockGetMemberDetails } = require('../../core/trello-client');
    
    __mockGetOrganizationMembers.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched members',
      data: mockMembers,
    });

    __mockGetMemberDetails.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched member details',
      data: { email: 'john@example.com' },
    });

    const mockEvent1 = createMockEvent();
    const mockEvent2 = createMockEvent({
      payload: {
        connection_data: {
          key: 'key=different-key&token=different-token',
          org_id: 'different-org-id',
        },
      },
    });

    await run([mockEvent1, mockEvent2]);

    // Verify only one call was made with the first event's credentials
    expect(TrelloClient).toHaveBeenCalledTimes(1);
    expect(TrelloClient).toHaveBeenCalledWith({
      apiKey: 'test-api-key',
      token: 'test-token',
    });
  });

  it('should filter out failed member detail requests', async () => {
    const mockMembers = [
      {
        id: 'user-1',
        fullName: 'John Doe',
        username: 'johndoe',
      },
      {
        id: 'user-2',
        fullName: 'Jane Smith',
        username: 'janesmith',
      },
    ];

    const { __mockGetOrganizationMembers, __mockGetMemberDetails } = require('../../core/trello-client');
    
    __mockGetOrganizationMembers.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched members',
      data: mockMembers,
    });

    __mockGetMemberDetails
      .mockResolvedValueOnce({
        status_code: 200,
        api_delay: 0,
        message: 'Successfully fetched member details',
        data: { email: 'john@example.com' },
      })
      .mockResolvedValueOnce({
        status_code: 404,
        api_delay: 0,
        message: 'Member not found',
      });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result.status_code).toBe(200);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].id).toBe('user-1');
  });
});