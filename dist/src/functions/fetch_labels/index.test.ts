import run from './index';
import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

// Mock the TrelloClient
jest.mock('../../core/trello-client', () => {
  const mockGetLabels = jest.fn();
  const mockTrelloClient = jest.fn().mockImplementation(() => ({
    getLabels: mockGetLabels,
  }));

  return {
    TrelloClient: mockTrelloClient,
    parseConnectionData: jest.requireActual('../../core/trello-client').parseConnectionData,
    __mockGetLabels: mockGetLabels,
  };
});

describe('fetch_labels function', () => {
  const createMockEvent = (overrides?: Partial<FunctionInput>): FunctionInput => ({
    payload: {
      connection_data: {
        key: 'key=test-api-key&token=test-token',
      },
      board_id: 'test-board-id',
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
      function_name: 'fetch_labels',
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
    const { __mockGetLabels } = require('../../core/trello-client');
    __mockGetLabels.mockReset();
  });

  it('should successfully fetch labels', async () => {
    const mockLabels = [
      {
        id: 'label-1',
        name: 'Bug',
        color: 'red',
      },
      {
        id: 'label-2',
        name: 'Feature',
        color: 'green',
      },
    ];

    const { __mockGetLabels } = require('../../core/trello-client');
    __mockGetLabels.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched labels',
      data: mockLabels,
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result).toEqual({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched 2 labels',
      data: [
        {
          name: 'Bug',
          style: '#FF0000',
          description: 'Bug',
        },
        {
          name: 'Feature',
          style: '#008000',
          description: 'Feature',
        },
      ],
    });
  });

  it('should handle labels with empty names', async () => {
    const mockLabels = [
      {
        id: 'label-1',
        name: '',
        color: 'blue',
      },
      {
        id: 'label-2',
        name: '',
        color: 'yellow',
      },
    ];

    const { __mockGetLabels } = require('../../core/trello-client');
    __mockGetLabels.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched labels',
      data: mockLabels,
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result.data).toBeDefined();
    expect(result.data![0].name).toBe('label-blue');
    expect(result.data![0].description).toBe('label-blue');
    expect(result.data![1].name).toBe('label-yellow');
    expect(result.data![1].description).toBe('label-yellow');
  });

  it('should convert all colors to correct hex codes', async () => {
    const colorTests = [
      { color: 'green', hex: '#008000' },
      { color: 'blue', hex: '#0000FF' },
      { color: 'orange', hex: '#FFA500' },
      { color: 'purple', hex: '#800080' },
      { color: 'red', hex: '#FF0000' },
      { color: 'yellow', hex: '#FFFF00' },
      { color: 'black', hex: '#000000' },
      { color: 'white', hex: '#FFFFFF' },
      { color: 'gray', hex: '#808080' },
      { color: 'brown', hex: '#A52A2A' },
      { color: 'pink', hex: '#FFC0CB' },
      { color: 'cyan', hex: '#00FFFF' },
      { color: 'magenta', hex: '#FF00FF' },
      { color: 'lime', hex: '#00FF00' },
      { color: 'navy', hex: '#000080' },
      { color: 'maroon', hex: '#800000' },
      { color: 'olive', hex: '#808000' },
      { color: 'teal', hex: '#008080' },
      { color: 'silver', hex: '#C0C0C0' },
    ];

    for (const test of colorTests) {
      const mockLabels = [
        {
          id: 'label-1',
          name: 'Test',
          color: test.color,
        },
      ];

      const { __mockGetLabels } = require('../../core/trello-client');
      __mockGetLabels.mockResolvedValue({
        status_code: 200,
        api_delay: 0,
        message: 'Successfully fetched labels',
        data: mockLabels,
      });

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      expect(result.data![0].style).toBe(test.hex);
    }
  });

  it('should use default hex code for unknown colors', async () => {
    const mockLabels = [
      {
        id: 'label-1',
        name: 'Test',
        color: 'unknown-color',
      },
    ];

    const { __mockGetLabels } = require('../../core/trello-client');
    __mockGetLabels.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched labels',
      data: mockLabels,
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result.data![0].style).toBe('#000000');
  });

  it('should handle rate limiting', async () => {
    const { __mockGetLabels } = require('../../core/trello-client');
    __mockGetLabels.mockResolvedValue({
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
    const { __mockGetLabels } = require('../../core/trello-client');
    __mockGetLabels.mockResolvedValue({
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
        board_id: 'test-board-id',
      },
    });

    await expect(run([mockEvent])).rejects.toThrow('Missing connection data key');
  });

  it('should throw error for missing board ID', async () => {
    const mockEvent = createMockEvent({
      payload: {
        connection_data: {
          key: 'key=test-api-key&token=test-token',
        },
      },
    });

    await expect(run([mockEvent])).rejects.toThrow('Missing board ID');
  });

  it('should process only the first event', async () => {
    const mockLabels = [
      {
        id: 'label-1',
        name: 'Test',
        color: 'red',
      },
    ];

    const { __mockGetLabels } = require('../../core/trello-client');
    __mockGetLabels.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched labels',
      data: mockLabels,
    });

    const mockEvent1 = createMockEvent();
    const mockEvent2 = createMockEvent({
      payload: {
        connection_data: {
          key: 'key=different-key&token=different-token',
        },
        board_id: 'different-board-id',
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

  it('should handle case-insensitive color matching', async () => {
    const mockLabels = [
      {
        id: 'label-1',
        name: 'Test',
        color: 'RED',
      },
      {
        id: 'label-2',
        name: 'Test2',
        color: 'Green',
      },
    ];

    const { __mockGetLabels } = require('../../core/trello-client');
    __mockGetLabels.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched labels',
      data: mockLabels,
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expect(result.data![0].style).toBe('#FF0000');
    expect(result.data![1].style).toBe('#008000');
  });
});