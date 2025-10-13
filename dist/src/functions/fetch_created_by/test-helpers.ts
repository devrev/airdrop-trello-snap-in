import { FetchCreatedByResponse } from './index';
import { TrelloAction, TrelloApiResponse } from '../../core/trello-client';
import { createMockEvent } from './test-setup';

/**
 * Creates test scenarios for various card actions configurations
 */
export const createCardActionsTestScenarios = () => {
  return {
    emptyActions: {
      description: 'should handle empty card actions response',
      mockResponse: {
        data: [],
        status_code: 200,
        api_delay: 0,
        message: 'Successfully retrieved card actions',
      } as TrelloApiResponse<TrelloAction[]>,
      expectedMessage: 'No card creation action found or creator ID missing',
    },
    missingCreatorId: {
      description: 'should handle action without creator ID',
      mockResponse: {
        data: [{
          id: 'action-123',
          type: 'createCard',
          date: '2025-01-01T12:00:00.000Z',
          // missing idMemberCreator
        }],
        status_code: 200,
        api_delay: 0,
        message: 'Successfully retrieved card actions',
      } as TrelloApiResponse<TrelloAction[]>,
      expectedMessage: 'No card creation action found or creator ID missing',
    },
    customAction: {
      description: 'should extract creator ID correctly',
      mockResponse: {
        data: [{
          id: 'custom-action',
          idMemberCreator: 'custom-creator-123',
          type: 'createCard',
          date: '2025-01-15T14:30:00.000Z',
        }],
        status_code: 200,
        api_delay: 0,
        message: 'Successfully retrieved card actions',
      } as TrelloApiResponse<TrelloAction[]>,
      expectedCreatorId: 'custom-creator-123',
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
      description: 'should handle card not found errors',
      mockResponse: {
        status_code: 404,
        api_delay: 0,
        message: 'Card not found',
      } as TrelloApiResponse,
    },
    successWithoutData: {
      description: 'should handle successful response without actions data',
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
  const mockEvent1 = createMockEvent('key=api-key-1&token=token-1', 'card-1');
  const mockEvent2 = createMockEvent('key=api-key-2&token=token-2', 'card-2');
  
  return {
    events: [mockEvent1, mockEvent2],
    expectedConnectionData: 'key=api-key-1&token=token-1',
    expectedCardId: 'card-1',
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
        mockInstance.getCardActions.mockRejectedValue(new Error('Network error'));
      },
    },
    unknownError: {
      description: 'should handle unknown errors gracefully',
      errorMessage: 'Unknown error occurred during card creator fetching',
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
export const validateSuccessResponseStructure = (result: FetchCreatedByResponse) => {
  expect(result.status).toBe('success');
  expect(result.status_code).toBe(200);
  expect(result.api_delay).toBe(0);
  expect(result.message).toBe('Successfully retrieved card creator ID');
  expect(result.timestamp).toBeDefined();
  expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  expect(result.creator_id).toBeDefined();
};

/**
 * Validates that a response matches the expected failure pattern
 */
export const validateFailureResponseStructure = (
  result: FetchCreatedByResponse,
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
  expect(result.creator_id).toBeUndefined();
};