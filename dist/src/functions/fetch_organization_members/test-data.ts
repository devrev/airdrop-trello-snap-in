import { TrelloOrganizationMember, TrelloApiResponse } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';

// Common test data
export const mockOrganizationMembersData: TrelloOrganizationMember[] = [
  {
    id: 'member-123',
    fullName: 'John Doe',
    username: 'johndoe',
    lastActive: '2025-01-01T12:00:00.000Z',
  },
  {
    id: 'member-456',
    fullName: 'Jane Smith',
    username: 'janesmith',
    lastActive: '2024-12-31T10:00:00.000Z',
  },
  {
    id: 'member-789',
    fullName: 'Bob Johnson',
    username: 'bobjohnson',
    lastActive: '2024-12-30T08:00:00.000Z',
  },
];

export const successfulOrganizationMembersResponse: TrelloApiResponse<TrelloOrganizationMember[]> = {
  data: mockOrganizationMembersData,
  status_code: 200,
  api_delay: 0,
  message: 'Successfully retrieved organization members',
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
  message: 'Organization not found',
};

// Helper function to transform members data to match implementation output
export const transformMembersForExpectation = (members: TrelloOrganizationMember[]) => {
  return members.map(member => {
    const { fullName, lastActive, ...memberWithoutCamelCase } = member;
    return {
      ...memberWithoutCamelCase,
      full_name: fullName,
      last_active: lastActive,
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
      payload: { ...event.payload, connection_data: { org_id: 'test-org' } } 
    }),
    expectedMessage: 'Invalid event: missing key in connection_data'
  },
  { 
    name: 'missing org_id in connection_data',
    eventModifier: (event: FunctionInput) => ({ 
      ...event, 
      payload: { ...event.payload, connection_data: { key: 'test-key' } } 
    }),
    expectedMessage: 'Invalid event: missing org_id in connection_data'
  },
];