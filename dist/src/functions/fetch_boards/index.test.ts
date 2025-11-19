import run from './index';
import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

// Mock the TrelloClient
jest.mock('../../core/trello-client', () => {
  const mockGetBoards = jest.fn();
  const mockTrelloClient = jest.fn().mockImplementation(() => ({
    getBoards: mockGetBoards,
  }));
  
  return {
    TrelloClient: mockTrelloClient,
    parseConnectionData: jest.requireActual('../../core/trello-client').parseConnectionData,
    __mockGetBoards: mockGetBoards,
  };
});

describe('fetch_boards function', () => {
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
      function_name: 'fetch_boards',
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
    const { __mockGetBoards } = require('../../core/trello-client');
    __mockGetBoards.mockReset();
  });

  it('should successfully fetch boards', async () => {
    const mockBoards = [
      {
        id: 'board-1',
        name: 'Test Board 1',
        desc: 'Test description 1',
      },
      {
        id: 'board-2',
        name: 'Test Board 2',
        desc: 'Test description 2',
      },
    ];

    const { __mockGetBoards } = require('../../core/trello-client');
    __mockGetBoards
      .mockResolvedValue({
        status_code: 200,
        api_delay: 0,
        message: 'Successfully fetched boards',
        data: mockBoards,
      });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result).toEqual({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched 2 boards',
      data: [
        {
          id: 'board-1',
          name: 'Test Board 1',
          description: 'Test description 1',
          item_type: 'cards',
        },
        {
          id: 'board-2',
          name: 'Test Board 2',
          description: 'Test description 2',
          item_type: 'cards',
        },
      ],
    });
  });

  it('should handle boards with empty descriptions', async () => {
    const mockBoards = [
      {
        id: 'board-1',
        name: 'Test Board',
        desc: '',
      },
    ];

    const { __mockGetBoards } = require('../../core/trello-client');
    __mockGetBoards
      .mockResolvedValue({
        status_code: 200,
        api_delay: 0,
        message: 'Successfully fetched boards',
        data: mockBoards,
      });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result.data).toBeDefined();
    expect(result.data![0].description).toBe('');
  });

  it('should handle rate limiting', async () => {
    const { __mockGetBoards } = require('../../core/trello-client');
    __mockGetBoards
      .mockResolvedValue({
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
    const { __mockGetBoards } = require('../../core/trello-client');
    __mockGetBoards
      .mockResolvedValue({
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
    const mockBoards = [
      {
        id: 'board-1',
        name: 'Test Board',
        desc: 'Test description',
      },
    ];

    const { __mockGetBoards } = require('../../core/trello-client');
    __mockGetBoards
      .mockResolvedValue({
        status_code: 200,
        api_delay: 0,
        message: 'Successfully fetched boards',
        data: mockBoards,
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
});