import { TrelloCard, TrelloApiResponse } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';

// Common test data
export const mockBoardCardsData: TrelloCard[] = [
  {
    id: 'card-123',
    name: 'Test Card 1',
    desc: 'Test card description',
    closed: false,
    dateLastActivity: '2025-01-01T12:00:00.000Z',
    idBoard: 'board-123',
    idList: 'list-456',
    attachments: [
      {
        id: 'attachment-1',
        name: 'test-file.pdf',
        url: 'https://example.com/test-file.pdf',
      },
    ],
  },
  {
    id: 'card-456',
    name: 'Test Card 2',
    desc: '',
    closed: true,
    dateLastActivity: '2024-12-31T10:00:00.000Z',
    idBoard: 'board-123',
    idList: 'list-789',
    attachments: [],
  },
];

export const successfulBoardCardsResponse: TrelloApiResponse<TrelloCard[]> = {
  data: mockBoardCardsData,
  status_code: 200,
  api_delay: 0,
  message: 'Successfully retrieved board cards',
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
  message: 'Board not found',
};

// Helper function to transform cards data to match implementation output
export const transformCardsForExpectation = (cards: TrelloCard[]) => {
  return cards.map(card => {
    const { dateLastActivity, ...cardWithoutCamelCase } = card;
    return {
      ...cardWithoutCamelCase,
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
  { 
    name: 'missing event_context',
    eventModifier: (event: FunctionInput) => ({ 
      ...event, 
      payload: { ...event.payload, event_context: undefined } 
    }),
    expectedMessage: 'Invalid event: missing event_context in payload'
  },
  { 
    name: 'missing external_sync_unit_id in event_context',
    eventModifier: (event: FunctionInput) => ({ 
      ...event, 
      payload: { ...event.payload, event_context: {} } 
    }),
    expectedMessage: 'Invalid event: missing external_sync_unit_id in event_context'
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
    name: 'missing limit in global_values',
    eventModifier: (event: FunctionInput) => ({ 
      ...event, 
      input_data: { ...event.input_data, global_values: {} } 
    }),
    expectedMessage: 'Invalid event: missing limit in global_values'
  },
];