import { FunctionInput } from '../../core/types';
import { FetchOrganizationMembersResponse } from './index';
import { TrelloOrganizationMember, TrelloApiResponse } from '../../core/trello-client';
import { createMockEvent } from './test-setup';

/**
 * Creates test scenarios for various organization members configurations
 */
export const createOrganizationMembersTestScenarios = () => {
  return {
    emptyMembers: {
      description: 'should handle empty organization members response',
      mockResponse: {
        data: [],
        status_code: 200,
        api_delay: 0,
        message: 'Successfully retrieved organization members',
      } as TrelloApiResponse<TrelloOrganizationMember[]>,
      expectedMembers: [],
    },
    customMember: {
      description: 'should map member properties correctly',
      mockResponse: {
        data: [{
          id: 'custom-member',
          fullName: 'Custom Member',
          username: 'custommember',
          lastActive: '2025-01-15T14:30:00.000Z',
          customProperty: 'custom-value',
        }],
        status_code: 200,
        api_delay: 0,
        message: 'Successfully retrieved organization members',
      } as TrelloApiResponse<TrelloOrganizationMember[]>,
      expectedMember: {
        id: 'custom-member',
        full_name: 'Custom Member',
        username: 'custommember',
        last_active: '2025-01-15T14:30:00.000Z',
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
      description: 'should handle organization not found errors',
      mockResponse: {
        status_code: 404,
        api_delay: 0,
        message: 'Organization not found',
      } as TrelloApiResponse,
    },
    successWithoutData: {
      description: 'should handle successful response without members data',
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
  const mockEvent1 = createMockEvent('key=api-key-1&token=token-1', 'org-1');
  const mockEvent2 = createMockEvent('key=api-key-2&token=token-2', 'org-2');
  
  return {
    events: [mockEvent1, mockEvent2],
    expectedConnectionData: 'key=api-key-1&token=token-1',
    expectedOrgId: 'org-1',
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
        mockInstance.getOrganizationMembers.mockRejectedValue(new Error('Network error'));
      },
    },
    unknownError: {
      description: 'should handle unknown errors gracefully',
      errorMessage: 'Unknown error occurred during organization members fetching',
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
export const validateSuccessResponseStructure = (result: FetchOrganizationMembersResponse) => {
  expect(result.status).toBe('success');
  expect(result.status_code).toBe(200);
  expect(result.api_delay).toBe(0);
  expect(result.message).toBe('Successfully retrieved organization members');
  expect(result.timestamp).toBeDefined();
  expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  expect(result.members).toBeDefined();
  expect(Array.isArray(result.members)).toBe(true);
};

/**
 * Validates that a response matches the expected failure pattern
 */
export const validateFailureResponseStructure = (
  result: FetchOrganizationMembersResponse,
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
  expect(result.members).toBeUndefined();
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