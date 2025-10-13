import { TrelloClient } from '../../core/trello-client';
import { FunctionInput, Context, ExecutionMetadata, InputData } from '../../core/types';
import { FetchCreatedByResponse } from './index';

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
  function_name: 'fetch_created_by',
  event_type: 'test-event',
  devrev_endpoint: 'https://api.devrev.ai/',
});

export const createMockInputData = (idCard: string = 'test-card-id'): InputData => ({
  global_values: {
    idCard,
  },
  event_sources: {},
});

export const createMockEvent = (
  connectionKey: string = 'key=test-api-key&token=test-token',
  idCard: string = 'test-card-id'
): FunctionInput => ({
  payload: { 
    connection_data: {
      key: connectionKey,
    },
  },
  context: createMockContext(),
  execution_metadata: createMockExecutionMetadata(),
  input_data: createMockInputData(idCard),
});

// Global mock instance that will be returned by fromConnectionData
export let mockTrelloClientInstance: jest.Mocked<TrelloClient>;

// Mock TrelloClient instance setup
export const setupMockTrelloClient = () => {
  // Create a complete mock instance with all required properties
  mockTrelloClientInstance = {
    getCurrentMember: jest.fn(),
    getMemberBoards: jest.fn(),
    getOrganizationMembers: jest.fn(),
    getBoardCards: jest.fn(),
    downloadAttachment: jest.fn(),
    getCardActions: jest.fn(),
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
export const expectSuccessResponse = (result: FetchCreatedByResponse, expectedCreatorId?: string) => {
  expect(result.status).toBe('success');
  expect(result.status_code).toBe(200);
  expect(result.api_delay).toBe(0);
  expect(result.message).toBe('Successfully retrieved card creator ID');
  expect(result.timestamp).toBeDefined();
  expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  
  if (expectedCreatorId) {
    expect(result.creator_id).toBe(expectedCreatorId);
  } else {
    expect(result.creator_id).toBeDefined();
  }
};

export const expectFailureResponse = (
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