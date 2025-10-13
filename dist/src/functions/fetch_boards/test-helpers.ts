import { FunctionInput } from '../../core/types';
import { FetchBoardsResponse } from './index';
import { TrelloBoard, TrelloApiResponse } from '../../core/trello-client';
import { createMockEvent } from './test-setup';

/**
 * Creates test scenarios for various board configurations
 */
export const createBoardTestScenarios = () => {
  return {
    emptyBoards: {
      description: 'should handle empty boards response',
      mockResponse: {
        data: [],
        status_code: 200,
        api_delay: 0,
        message: 'Successfully retrieved member boards',
      } as TrelloApiResponse<TrelloBoard[]>,
      expectedBoards: [],
    },
    customBoard: {
      description: 'should map board properties correctly',
      mockResponse: {
        data: [{
          id: 'custom-board',
          name: 'Custom Board',
          desc: 'Custom description',
          closed: false,
          url: 'https://trello.com/b/custom/custom-board',
          shortUrl: 'https://trello.com/b/custom',
          dateLastActivity: '2025-01-15T14:30:00.000Z',
          customProperty: 'custom-value',
        }],
        status_code: 200,
        api_delay: 0,
        message: 'Successfully retrieved member boards',
      } as TrelloApiResponse<TrelloBoard[]>,
      expectedBoard: {
        short_url: 'https://trello.com/b/custom',
        date_last_activity: '2025-01-15T14:30:00.000Z',
        id: 'custom-board',
        name: 'Custom Board',
        desc: 'Custom description',
        closed: false,
        url: 'https://trello.com/b/custom/custom-board',
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
    successWithoutData: {
      description: 'should handle successful response without boards data',
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
  const mockEvent1 = createMockEvent('key=api-key-1&token=token-1');
  const mockEvent2 = createMockEvent('key=api-key-2&token=token-2');
  
  return {
    events: [mockEvent1, mockEvent2],
    expectedConnectionData: 'key=api-key-1&token=token-1',
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
        mockInstance.getMemberBoards.mockRejectedValue(new Error('Network error'));
      },
    },
    unknownError: {
      description: 'should handle unknown errors gracefully',
      errorMessage: 'Unknown error occurred during board fetching',
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
export const validateSuccessResponseStructure = (result: FetchBoardsResponse) => {
  expect(result.status).toBe('success');
  expect(result.status_code).toBe(200);
  expect(result.api_delay).toBe(0);
  expect(result.message).toBe('Successfully retrieved member boards');
  expect(result.timestamp).toBeDefined();
  expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  expect(result.boards).toBeDefined();
  expect(Array.isArray(result.boards)).toBe(true);
};

/**
 * Validates that a response matches the expected failure pattern
 */
export const validateFailureResponseStructure = (
  result: FetchBoardsResponse,
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
  expect(result.boards).toBeUndefined();
};

/**
 * Creates a test event that will cause an unknown error for testing error handling
 */
export const createUnknownErrorEvent = () => {
  const mockEvent = createMockEvent();
  Object.defineProperty(mockEvent, 'payload', {
    get: () => {
      throw 'string error'; // Non-Error object
    }
  });
  return mockEvent;
};