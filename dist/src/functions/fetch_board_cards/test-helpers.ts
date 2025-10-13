import { FunctionInput } from '../../core/types';
import { FetchBoardCardsResponse } from './index';
import { TrelloCard, TrelloApiResponse } from '../../core/trello-client';
import { createMockEvent } from './test-setup';

/**
 * Creates test scenarios for various board cards configurations
 */
export const createBoardCardsTestScenarios = () => {
  return {
    emptyCards: {
      description: 'should handle empty board cards response',
      mockResponse: {
        data: [],
        status_code: 200,
        api_delay: 0,
        message: 'Successfully retrieved board cards',
      } as TrelloApiResponse<TrelloCard[]>,
      expectedCards: [],
    },
    customCard: {
      description: 'should map card properties correctly',
      mockResponse: {
        data: [{
          id: 'custom-card',
          name: 'Custom Card',
          desc: 'Custom description',
          closed: false,
          dateLastActivity: '2025-01-15T14:30:00.000Z',
          customProperty: 'custom-value',
        }],
        status_code: 200,
        api_delay: 0,
        message: 'Successfully retrieved board cards',
      } as TrelloApiResponse<TrelloCard[]>,
      expectedCard: {
        id: 'custom-card',
        name: 'Custom Card',
        desc: 'Custom description',
        closed: false,
        date_last_activity: '2025-01-15T14:30:00.000Z',
        customProperty: 'custom-value',
      },
    },
    serverError: {
      description: 'should handle server errors correctly',
      mockResponse: {
        status_code: 500,
        api_delay: 0,
        message: 'Trello API server error',
      } as TrelloApiResponse,
    },
    notFoundError: {
      description: 'should handle board not found errors',
      mockResponse: {
        status_code: 404,
        api_delay: 0,
        message: 'Board not found',
      } as TrelloApiResponse,
    },
    successWithoutData: {
      description: 'should handle successful response without cards data',
      mockResponse: {
        status_code: 200,
        api_delay: 0,
        message: 'Success but no data',
      } as TrelloApiResponse,
    },
  };
};

/**
 * Creates test cases for multiple events scenarios
 */
export const createMultipleEventsTestCase = () => {
  const mockEvent1 = createMockEvent('key=api-key-1&token=token-1', 'board-1', '5');
  const mockEvent2 = createMockEvent('key=api-key-2&token=token-2', 'board-2', '10');
  
  return {
    events: [mockEvent1, mockEvent2],
    expectedConnectionData: 'key=api-key-1&token=token-1',
    expectedBoardId: 'board-1',
    expectedLimit: 5,
    description: 'should process only the first event when multiple events are provided',
  };
};

/**
 * Creates test cases for error scenarios
 */
export const createErrorTestScenarios = () => {
  return {
    clientCreationError: {
      description: 'should handle TrelloClient creation errors',
      errorMessage: 'Invalid connection data format',
      setupMock: (TrelloClientMock: any) => {
        jest.spyOn(TrelloClientMock, 'fromConnectionData').mockImplementation(() => {
          throw new Error('Invalid connection data format');
        });
      },
    },
    apiCallError: {
      description: 'should handle API call errors',
      errorMessage: 'Network error',
      setupMock: (mockInstance: any) => {
        mockInstance.getBoardCards.mockRejectedValue(new Error('Network error'));
      },
    },
    unknownError: {
      description: 'should handle unknown errors gracefully',
      errorMessage: 'Unknown error occurred during board cards fetching',
      createEvent: () => {
        const mockEvent = createMockEvent();
        Object.defineProperty(mockEvent, 'payload', {
          get: () => {
            throw 'string error'; // Non-Error object
          }
        });
        return mockEvent;
      },
      expectedConsoleLog: {
        error_message: 'Unknown error',
        error_stack: undefined,
        timestamp: expect.any(String),
      },
    },
  };
};

/**
 * Validates that a response matches the expected success pattern
 */
export const validateSuccessResponseStructure = (result: FetchBoardCardsResponse) => {
  expect(result.status).toBe('success');
  expect(result.status_code).toBe(200);
  expect(result.api_delay).toBe(0);
  expect(result.message).toBe('Successfully retrieved board cards');
  expect(result.timestamp).toBeDefined();
  expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  expect(result.cards).toBeDefined();
  expect(Array.isArray(result.cards)).toBe(true);
};

/**
 * Validates that a response matches the expected failure pattern
 */
export const validateFailureResponseStructure = (
  result: FetchBoardCardsResponse,
  expectedStatusCode: number,
  expectedMessage: string,
  expectedApiDelay: number = 0
) => {
  expect(result.status).toBe('failure');
  expect(result.status_code).toBe(expectedStatusCode);
  expect(result.api_delay).toBe(expectedApiDelay);
  expect(result.message).toBe(expectedMessage);
  expect(result.timestamp).toBeDefined();
  expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  expect(result.cards).toBeUndefined();
};

/**
 * Creates pagination test scenarios
 */
export const createPaginationTestScenarios = () => {
  return {
    withBefore: {
      description: 'should handle pagination with before parameter',
      createEvent: () => createMockEvent('key=test&token=test', 'board-123', '5', 'card-456'),
      expectedParams: { limit: 5, before: 'card-456' },
    },
    withoutBefore: {
      description: 'should handle pagination without before parameter',
      createEvent: () => createMockEvent('key=test&token=test', 'board-123', '10'),
      expectedParams: { limit: 10, before: undefined },
    },
    invalidLimit: {
      description: 'should handle invalid limit parameter',
      createEvent: () => createMockEvent('key=test&token=test', 'board-123', 'invalid'),
      expectedError: 'Invalid event: limit must be a positive integer',
    },
    zeroLimit: {
      description: 'should handle zero limit parameter',
      createEvent: () => createMockEvent('key=test&token=test', 'board-123', '0'),
      expectedError: 'Invalid event: limit must be a positive integer',
    },
    negativeLimit: {
      description: 'should handle negative limit parameter',
      createEvent: () => createMockEvent('key=test&token=test', 'board-123', '-5'),
      expectedError: 'Invalid event: limit must be a positive integer',
    },
  };
};