import { ExtractorEventType, WorkerAdapter } from '@devrev/ts-adaas';
import { TrelloClient, parseConnectionData } from '../../../core/trello-client';

// Mock dependencies
jest.mock('../../../core/trello-client', () => {
  const mockGetBoards = jest.fn();
  const mockTrelloClient = jest.fn().mockImplementation(() => ({
    getBoards: mockGetBoards,
  }));

  return {
    TrelloClient: mockTrelloClient,
    parseConnectionData: jest.fn((key: string) => ({
      apiKey: 'test-api-key',
      token: 'test-token',
    })),
    __mockGetBoards: mockGetBoards,
  };
});

jest.mock('@devrev/ts-adaas', () => {
  const mockEmit = jest.fn();
  const mockAdapter = {
    event: {
      payload: {
        connection_data: {
          key: 'key=test-api-key&token=test-token',
          org_id: 'test-org-id',
        },
      },
    },
    emit: mockEmit,
  };

  return {
    ExtractorEventType: {
      ExtractionExternalSyncUnitsDone: 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE',
      ExtractionExternalSyncUnitsError: 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR',
    },
    processTask: jest.fn((config: any) => {
      // Store the task and onTimeout functions for testing
      (global as any).__taskFunction = config.task;
      (global as any).__onTimeoutFunction = config.onTimeout;
    }),
    WorkerAdapter: jest.fn(),
    __mockEmit: mockEmit,
    __mockAdapter: mockAdapter,
  };
});

describe('external-sync-units-extraction worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { __mockGetBoards } = require('../../../core/trello-client');
    __mockGetBoards.mockReset();
  });

  it('should successfully extract external sync units', async () => {
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

    const { __mockGetBoards, __mockEmit, __mockAdapter } = require('@devrev/ts-adaas');
    const { __mockGetBoards: trelloMockGetBoards } = require('../../../core/trello-client');

    trelloMockGetBoards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched boards',
      data: mockBoards,
    });

    // Import the worker to trigger processTask
    require('./external-sync-units-extraction');

    // Execute the task function
    const taskFunction = (global as any).__taskFunction;
    await taskFunction({ adapter: __mockAdapter });

    expect(__mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionExternalSyncUnitsDone,
      {
        external_sync_units: [
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
      }
    );
  });

  it('should handle boards with empty descriptions', async () => {
    const mockBoards = [
      {
        id: 'board-1',
        name: 'Test Board',
        desc: '',
      },
    ];

    const { __mockEmit, __mockAdapter } = require('@devrev/ts-adaas');
    const { __mockGetBoards } = require('../../../core/trello-client');

    __mockGetBoards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched boards',
      data: mockBoards,
    });

    require('./external-sync-units-extraction');

    const taskFunction = (global as any).__taskFunction;
    await taskFunction({ adapter: __mockAdapter });

    expect(__mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionExternalSyncUnitsDone,
      {
        external_sync_units: [
          {
            id: 'board-1',
            name: 'Test Board',
            description: '',
            item_type: 'cards',
          },
        ],
      }
    );
  });

  it('should handle rate limiting', async () => {
    const { __mockEmit, __mockAdapter } = require('@devrev/ts-adaas');
    const { __mockGetBoards } = require('../../../core/trello-client');

    __mockGetBoards.mockResolvedValue({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded',
    });

    require('./external-sync-units-extraction');

    const taskFunction = (global as any).__taskFunction;
    await taskFunction({ adapter: __mockAdapter });

    expect(__mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionExternalSyncUnitsError,
      {
        error: {
          message: 'Rate limit exceeded while fetching boards',
        },
      }
    );
  });

  it('should handle API errors', async () => {
    const { __mockEmit, __mockAdapter } = require('@devrev/ts-adaas');
    const { __mockGetBoards } = require('../../../core/trello-client');

    __mockGetBoards.mockResolvedValue({
      status_code: 500,
      api_delay: 0,
      message: 'Internal server error',
    });

    require('./external-sync-units-extraction');

    const taskFunction = (global as any).__taskFunction;
    await taskFunction({ adapter: __mockAdapter });

    expect(__mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionExternalSyncUnitsError,
      {
        error: {
          message: 'Internal server error',
        },
      }
    );
  });

  it('should handle missing connection data key', async () => {
    const { __mockEmit } = require('@devrev/ts-adaas');
    const mockAdapter = {
      event: {
        payload: {
          connection_data: {
            org_id: 'test-org-id',
          },
        },
      },
      emit: __mockEmit,
    };

    require('./external-sync-units-extraction');

    const taskFunction = (global as any).__taskFunction;
    await taskFunction({ adapter: mockAdapter });

    expect(__mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionExternalSyncUnitsError,
      {
        error: {
          message: 'Failed to extract external sync units: Missing connection data key',
        },
      }
    );
  });

  it('should handle missing organization ID', async () => {
    const { __mockEmit } = require('@devrev/ts-adaas');
    const mockAdapter = {
      event: {
        payload: {
          connection_data: {
            key: 'key=test-api-key&token=test-token',
          },
        },
      },
      emit: __mockEmit,
    };

    require('./external-sync-units-extraction');

    const taskFunction = (global as any).__taskFunction;
    await taskFunction({ adapter: mockAdapter });

    expect(__mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionExternalSyncUnitsError,
      {
        error: {
          message: 'Failed to extract external sync units: Missing organization ID',
        },
      }
    );
  });

  it('should handle timeout', async () => {
    const { __mockEmit, __mockAdapter } = require('@devrev/ts-adaas');

    require('./external-sync-units-extraction');

    const onTimeoutFunction = (global as any).__onTimeoutFunction;
    await onTimeoutFunction({ adapter: __mockAdapter });

    expect(__mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionExternalSyncUnitsError,
      {
        error: {
          message: 'Failed to extract external sync units. Lambda timeout.',
        },
      }
    );
  });

  it('should handle empty boards array', async () => {
    const { __mockEmit, __mockAdapter } = require('@devrev/ts-adaas');
    const { __mockGetBoards } = require('../../../core/trello-client');

    __mockGetBoards.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully fetched boards',
      data: [],
    });

    require('./external-sync-units-extraction');

    const taskFunction = (global as any).__taskFunction;
    await taskFunction({ adapter: __mockAdapter });

    expect(__mockEmit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionExternalSyncUnitsDone,
      {
        external_sync_units: [],
      }
    );
  });
});