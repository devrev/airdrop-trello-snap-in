import { TrelloAction, TrelloApiResponse } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';

// Common test data
export const mockCardActionsData: TrelloAction[] = [
  {
    id: 'action-123',
    idMemberCreator: 'member-456',
    type: 'createCard',
    date: '2025-01-01T12:00:00.000Z',
  },
];

export const successfulCardActionsResponse: TrelloApiResponse<TrelloAction[]> = {
  data: mockCardActionsData,
  status_code: 200,
  api_delay: 0,
  message: 'Successfully retrieved card actions',
};

export const authFailureResponse: TrelloApiResponse = {
  status_code: 401,
  api_delay: 0,
  message: 'Authentication failed - invalid API key or token',
};

export const rateLimitResponse: TrelloApiResponse = {
  status_code: 429,
  api_delay: 60,
  message: 'Rate limit exceeded - retry after 60 seconds',
};

export const notFoundResponse: TrelloApiResponse = {
  status_code: 404,
  api_delay: 0,
  message: 'Card not found',
};

// Test case generators for common validation scenarios
export const createInvalidInputTestCases = () => [
  { input: null, expectedMessage: 'Invalid input: events must be an array' },
  { input: undefined, expectedMessage: 'Invalid input: events must be an array' },
  { input: 'not-array', expectedMessage: 'Invalid input: events must be an array' },
  { input: [], expectedMessage: 'Invalid input: events array cannot be empty' },
];

export const createInvalidEventTestCases = () => [
  { 
    name: 'null event',
    eventModifier: () => null,
    expectedMessage: 'Invalid event: event cannot be null or undefined'
  },
  { 
    name: 'undefined event',
    eventModifier: () => undefined,
    expectedMessage: 'Invalid event: event cannot be null or undefined'
  },
  { 
    name: 'missing payload',
    eventModifier: (event: FunctionInput) => ({ ...event, payload: undefined }),
    expectedMessage: 'Invalid event: missing payload'
  },
  { 
    name: 'missing connection_data',
    eventModifier: (event: FunctionInput) => ({ 
      ...event, 
      payload: { ...event.payload, connection_data: undefined } 
    }),
    expectedMessage: 'Invalid event: missing connection_data in payload'
  },
  { 
    name: 'missing key in connection_data',
    eventModifier: (event: FunctionInput) => ({ 
      ...event, 
      payload: { ...event.payload, connection_data: {} } 
    }),
    expectedMessage: 'Invalid event: missing key in connection_data'
  },
  { 
    name: 'missing input_data',
    eventModifier: (event: FunctionInput) => ({ 
      ...event, 
      input_data: undefined 
    }),
    expectedMessage: 'Invalid event: missing input_data'
  },
  { 
    name: 'missing global_values in input_data',
    eventModifier: (event: FunctionInput) => ({ 
      ...event, 
      input_data: { ...event.input_data, global_values: undefined } 
    }),
    expectedMessage: 'Invalid event: missing global_values in input_data'
  },
  { 
    name: 'missing idCard in global_values',
    eventModifier: (event: FunctionInput) => ({ 
      ...event, 
      input_data: { 
        ...event.input_data, 
        global_values: {} 
      } 
    }),
    expectedMessage: 'Invalid event: missing idCard in global_values'
  },
];