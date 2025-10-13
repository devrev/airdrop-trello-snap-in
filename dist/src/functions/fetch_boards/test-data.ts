import { TrelloBoard, TrelloApiResponse } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';

// Common test data
export const mockBoardsData: TrelloBoard[] = [
  {
    id: 'board-123',
    name: 'Test Board 1',
    desc: 'Test board description',
    closed: false,
    url: 'https://trello.com/b/board123/test-board-1',
    shortUrl: 'https://trello.com/b/board123',
    dateLastActivity: '2025-01-01T12:00:00.000Z',
    idOrganization: 'org-456',
  },
  {
    id: 'board-456',
    name: 'Test Board 2',
    desc: '',
    closed: true,
    url: 'https://trello.com/b/board456/test-board-2',
    shortUrl: 'https://trello.com/b/board456',
    dateLastActivity: '2024-12-31T10:00:00.000Z',
    idOrganization: undefined,
  },
];

export const successfulBoardsResponse: TrelloApiResponse<TrelloBoard[]> = {
  data: mockBoardsData,
  status_code: 200,
  api_delay: 0,
  message: 'Successfully retrieved member boards',
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

// Helper function to transform boards data to match implementation output
export const transformBoardsForExpectation = (boards: TrelloBoard[]) => {
  return boards.map(board => {
    const { shortUrl, dateLastActivity, ...boardWithoutCamelCase } = board;
    return {
      ...boardWithoutCamelCase,
      short_url: shortUrl,
      date_last_activity: dateLastActivity,
    };
  });
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
];