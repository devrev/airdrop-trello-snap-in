import run from './index';
import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

// Mock the TrelloClient
jest.mock('../../core/trello-client', () => {
  const mockGetComments = jest.fn();
  const mockTrelloClient = jest.fn().mockImplementation(() => ({
    getComments: mockGetComments,
  }));

  return {
    TrelloClient: mockTrelloClient,
    parseConnectionData: jest.requireActual('../../core/trello-client').parseConnectionData,
    __mockGetComments: mockGetComments,
  };
});

describe('fetch_comments function', () => {
  const createMockEvent = (overrides?: Partial<FunctionInput>): FunctionInput => ({
    payload: {
      connection_data: {
        key: 'key=test-api-key&token=test-token',
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
      function_name: 'fetch_comments',
      event_type: 'test-event',
      devrev_endpoint: 'https://api.devrev.ai/',
    },
    input_data: {
      global_values: {
        idCard: 'test-card-id',
      },
      event_sources: {},
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const { __mockGetComments } = require('../../core/trello-client');
    __mockGetComments.mockReset();
  });

  it('should successfully fetch comments', async () => {
    const mockComments = [
      {
        id: 'comment-1',
        idMemberCreator: 'user-1',
        data: {
          text: 'This is a comment',
          idCard: 'card-1',
          dateLastEdited: '2025-10-30T13:34:46.238Z',
          board: {
            id: 'board-1',
          },
        },
        date: '2025-10-30T13:26:02.902Z',
        memberCreator: {
          id: 'user-1',
          username: 'testuser',
          fullName: 'Test User',
          avatarHash: 'test-hash',
        },
      },
      {
        id: 'comment-2',
        idMemberCreator: 'user-2',
        data: {
          text: 'Another comment',
          idCard: 'card-1',
          dateLastEdited: '2025-10-30T14:00:00.000Z',
          board: {
            id: 'board-1',
          },
        },
        date: '2025-10-30T13:30:00.000Z',
        memberCreator: {
          id: 'user-2',
          username: 'anotheruser',
          fullName: 'Another User',
          avatarHash: 'another-hash',
        },
      },
    ];

    const { __mockGetComments } = require('../../core/trello-client');
    __mockGetComments.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched comments',
      data: mockComments,
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result).toEqual({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched 2 comments',
      data: [
        {
          id: 'comment-1',
          body: ['This is a comment'],
          parent_object_id: 'card-1',
          created_by_id: 'user-1',
          modified_date: '2025-10-30T13:34:46.238Z',
          grandparent_object_id: 'board-1',
          grandparent_object_type: 'board',
          creator_display_name: 'testuser',
          parent_object_type: 'issue',
        },
        {
          id: 'comment-2',
          body: ['Another comment'],
          parent_object_id: 'card-1',
          created_by_id: 'user-2',
          modified_date: '2025-10-30T14:00:00.000Z',
          grandparent_object_id: 'board-1',
          grandparent_object_type: 'board',
          creator_display_name: 'anotheruser',
          parent_object_type: 'issue',
        },
      ],
    });
  });

  it('should convert multiline text to rich text format', async () => {
    const mockComments = [
      {
        id: 'comment-1',
        idMemberCreator: 'user-1',
        data: {
          text: 'Line 1\nLine 2\n\nLine 4',
          idCard: 'card-1',
          dateLastEdited: '2025-10-30T13:34:46.238Z',
          board: {
            id: 'board-1',
          },
        },
        date: '2025-10-30T13:26:02.902Z',
        memberCreator: {
          id: 'user-1',
          username: 'testuser',
          fullName: 'Test User',
          avatarHash: 'test-hash',
        },
      },
    ];

    const { __mockGetComments } = require('../../core/trello-client');
    __mockGetComments.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched comments',
      data: mockComments,
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result.data![0].body).toEqual(['Line 1', 'Line 2', 'Line 4']);
  });

  it('should handle comments with missing optional fields', async () => {
    const mockComments = [
      {
        id: 'comment-1',
        idMemberCreator: 'user-1',
        data: {
          text: 'Comment text',
          idCard: 'card-1',
        },
        date: '2025-10-30T13:26:02.902Z',
      },
    ];

    const { __mockGetComments } = require('../../core/trello-client');
    __mockGetComments.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched comments',
      data: mockComments,
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result.data![0].modified_date).toBe('2025-10-30T13:26:02.902Z');
    expect(result.data![0].grandparent_object_id).toBe('');
    expect(result.data![0].creator_display_name).toBe('');
  });

  it('should handle empty comment text', async () => {
    const mockComments = [
      {
        id: 'comment-1',
        idMemberCreator: 'user-1',
        data: {
          text: '',
          idCard: 'card-1',
          dateLastEdited: '2025-10-30T13:34:46.238Z',
          board: {
            id: 'board-1',
          },
        },
        date: '2025-10-30T13:26:02.902Z',
        memberCreator: {
          id: 'user-1',
          username: 'testuser',
          fullName: 'Test User',
          avatarHash: 'test-hash',
        },
      },
    ];

    const { __mockGetComments } = require('../../core/trello-client');
    __mockGetComments.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched comments',
      data: mockComments,
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result.data![0].body).toEqual([]);
  });

  it('should handle rate limiting', async () => {
    const { __mockGetComments } = require('../../core/trello-client');
    __mockGetComments.mockResolvedValue({
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

  it('should handle API errors', async () => {
    const { __mockGetComments } = require('../../core/trello-client');
    __mockGetComments.mockResolvedValue({
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
        connection_data: {},
      },
    });

    await expect(run([mockEvent])).rejects.toThrow('Missing connection data key');
  });

  it('should throw error for missing card ID', async () => {
    const mockEvent = createMockEvent({
      input_data: {
        global_values: {},
        event_sources: {},
      },
    });

    await expect(run([mockEvent])).rejects.toThrow('Missing card ID');
  });

  it('should process only the first event', async () => {
    const mockComments = [
      {
        id: 'comment-1',
        idMemberCreator: 'user-1',
        data: {
          text: 'Test comment',
          idCard: 'card-1',
          dateLastEdited: '2025-10-30T13:34:46.238Z',
          board: {
            id: 'board-1',
          },
        },
        date: '2025-10-30T13:26:02.902Z',
        memberCreator: {
          id: 'user-1',
          username: 'testuser',
          fullName: 'Test User',
          avatarHash: 'test-hash',
        },
      },
    ];

    const { __mockGetComments } = require('../../core/trello-client');
    __mockGetComments.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched comments',
      data: mockComments,
    });

    const mockEvent1 = createMockEvent();
    const mockEvent2 = createMockEvent({
      payload: {
        connection_data: {
          key: 'key=different-key&token=different-token',
        },
      },
      input_data: {
        global_values: {
          idCard: 'different-card-id',
        },
        event_sources: {},
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

  it('should handle rate limiting with invalid delay', async () => {
    const { __mockGetComments } = require('../../core/trello-client');
    __mockGetComments.mockResolvedValue({
      status_code: 429,
      api_delay: NaN,
      message: 'Rate limit exceeded',
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result).toEqual({
      status_code: 429,
      api_delay: 3,
      message: 'Rate limit exceeded',
    });
  });
});