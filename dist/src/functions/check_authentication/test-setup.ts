import { TrelloClient, TrelloApiResponse, TrelloMember } from '../../core/trello-client';
import { FunctionInput, Context, ExecutionMetadata, InputData } from '../../core/types';
import { AuthenticationCheckResponse } from './index';

// Test data factories
export const createMockContext = (): Context => ({
  dev_oid: 'test-dev-oid',
  source_id: 'test-source-id',
  snap_in_id: 'test-snap-in-id',
  snap_in_version_id: 'test-snap-in-version-id',
  service_account_id: 'test-service-account-id',
  secrets: {
    service_account_token: 'test-token',
  },
});

export const createMockExecutionMetadata = (): ExecutionMetadata => ({
  request_id: 'test-request-id',
  function_name: 'check_authentication',
  event_type: 'test-event',
  devrev_endpoint: 'https://api.devrev.ai/',
});

export const createMockInputData = (): InputData => ({
  global_values: {},
  event_sources: {},
});

export const createMockEvent = (connectionKey: string = 'key=test-api-key&token=test-token'): FunctionInput => ({
  payload: { 
    connection_data: {
      key: connectionKey,
    },
  },
  context: createMockContext(),
  execution_metadata: createMockExecutionMetadata(),
  input_data: createMockInputData(),
});

// Common test data
export const mockMemberData: TrelloMember = {
  id: 'member-123',
  username: 'testuser',
  fullName: 'Test User',
};

export const successfulMemberResponse: TrelloApiResponse<TrelloMember> = {
  data: mockMemberData,
  status_code: 200,
  api_delay: 0,
  message: 'Successfully retrieved current member information',
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

// Global mock instance that will be returned by fromConnectionData
export let mockTrelloClientInstance: jest.Mocked<TrelloClient>;

// Mock TrelloClient instance setup
export const setupMockTrelloClient = () => {
  // Create a complete mock instance with all required properties
  mockTrelloClientInstance = {
    getCurrentMember: jest.fn(),
    // Mock the private properties that exist on the real class
    axiosInstance: {} as any,
    apiKey: 'test-api-key',
    token: 'test-token',
    handleApiError: jest.fn(),
  } as unknown as jest.Mocked<TrelloClient>;
  
  // Mock the static methods properly
  jest.spyOn(TrelloClient, 'fromConnectionData').mockReturnValue(mockTrelloClientInstance);
  jest.spyOn(TrelloClient, 'parseConnectionData').mockReturnValue({ 
    apiKey: 'test-api-key', 
    token: 'test-token' 
  });

  return mockTrelloClientInstance;
};

// Export helper functions for accessing the mocked static methods
export const mockFromConnectionData = () => 
  TrelloClient.fromConnectionData as jest.MockedFunction<typeof TrelloClient.fromConnectionData>;

export const mockParseConnectionData = () => 
  TrelloClient.parseConnectionData as jest.MockedFunction<typeof TrelloClient.parseConnectionData>;

// Test utilities
export const setupConsoleSpies = () => {
  return {
    errorSpy: jest.spyOn(console, 'error').mockImplementation(() => {}),
  };
};

export const clearAllMocks = () => {
  jest.clearAllMocks();
};

// Assertion helpers
export const expectSuccessResponse = (result: AuthenticationCheckResponse, expectedMemberInfo?: any) => {
  expect(result.status).toBe('success');
  expect(result.status_code).toBe(200);
  expect(result.api_delay).toBe(0);
  expect(result.message).toBe('Authentication successful - API key and token are valid');
  expect(result.timestamp).toBeDefined();
  expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  
  if (expectedMemberInfo) {
    expect(result.member_info).toEqual(expectedMemberInfo);
  }
};

export const expectFailureResponse = (
  result: AuthenticationCheckResponse, 
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