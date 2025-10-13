import { TrelloClient, TrelloBoard } from '../../../core/trello-client';
import { ExtractorEventType } from '@devrev/ts-adaas';

/**
 * Test setup utilities for external-sync-units-extraction tests
 */

export const createMockTrelloClientInstance = (): jest.Mocked<TrelloClient> => {
  return {
    getMemberBoards: jest.fn(),
  } as any;
};

export const createMockAdapter = (connectionData = { key: 'key=test-api-key&token=test-token' }) => {
  return {
    event: {
      payload: {
        connection_data: connectionData,
      },
    },
    emit: jest.fn(),
  };
};

export const createMockBoards = (): TrelloBoard[] => [
  {
    id: 'board-1',
    name: 'Test Board 1',
    desc: 'Test board description',
    closed: false,
  },
  {
    id: 'board-2',
    name: 'Test Board 2',
    desc: '',
    closed: false,
  },
];

export const createMockBoardWithoutDesc = (): TrelloBoard[] => [
  {
    id: 'board-1',
    name: 'Test Board',
    closed: false,
    // desc is undefined
  },
];

export const setupMocks = () => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
};

export const expectSuccessfulExtraction = (mockAdapter: any, expectedSyncUnits: any[]) => {
  expect(mockAdapter.emit).toHaveBeenCalledWith(
    ExtractorEventType.ExtractionExternalSyncUnitsDone,
    {
      external_sync_units: expectedSyncUnits,
    }
  );
};

export const expectErrorExtraction = (mockAdapter: any, expectedMessage: string) => {
  expect(mockAdapter.emit).toHaveBeenCalledWith(
    ExtractorEventType.ExtractionExternalSyncUnitsError,
    {
      error: {
        message: expectedMessage,
      },
    }
  );
};

export const createSuccessfulBoardsResponse = (boards: TrelloBoard[]) => ({
  data: boards,
  status_code: 200,
  api_delay: 0,
  message: 'Success',
});

export const createErrorResponse = (statusCode: number, message: string) => ({
  status_code: statusCode,
  api_delay: 0,
  message,
});

export const expectConsoleError = (expectedMessage: string) => {
  const consoleSpy = jest.spyOn(console, 'error');
  return consoleSpy;
};