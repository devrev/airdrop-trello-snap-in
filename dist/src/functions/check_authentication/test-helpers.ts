import { FunctionInput } from '../../core/types';
import { TrelloClient, parseApiCredentials } from '../../core/trello-client';

// Mock the entire trello-client module
jest.mock('../../core/trello-client', () => {
  // Store original module
  const originalModule = jest.requireActual('../../core/trello-client');
  
  // Create mock functions
  const mockParseApiCredentials = jest.fn();
  const mockGetMember = jest.fn();
  
  // Create mock TrelloClient class
  const MockTrelloClient = jest.fn().mockImplementation(() => ({
    getMember: mockGetMember
  }));
  
  // Return the mock module
  return {
    __esModule: true,
    ...originalModule,
    parseApiCredentials: mockParseApiCredentials,
    TrelloClient: MockTrelloClient
  };
});

// Get the mocked versions
export const MockedTrelloClient = TrelloClient as jest.MockedClass<typeof TrelloClient>;
export const mockedParseApiCredentials = parseApiCredentials as jest.MockedFunction<typeof parseApiCredentials>;

// Test constants
export const MOCK_MEMBER_DATA = {
  id: 'user123',
  fullName: 'Test User',
  username: 'testuser'
};

export const MOCK_MEMBER_DATA_NO_FULLNAME = {
  id: 'user123',
  username: 'testuser'
};

// Mock event factory
export function createMockEvent(overrides: Partial<FunctionInput> = {}): FunctionInput {
  const baseEvent: FunctionInput = {
    payload: {
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'test-org-name',
        key: 'key=test-api-key&token=test-token',
        key_type: 'test-key-type'
      },
      event_context: {
        callback_url: 'test-callback-url',
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-dev-user',
        dev_user_id: 'test-dev-user-id',
        external_sync_unit: 'test-external-sync-unit',
        external_sync_unit_id: 'test-external-sync-unit-id',
        external_sync_unit_name: 'test-external-sync-unit-name',
        external_system: 'test-external-system',
        external_system_type: 'test-external-system-type',
        import_slug: 'test-import-slug',
        mode: 'INITIAL',
        request_id: 'test-request-id',
        snap_in_slug: 'test-snap-in-slug',
        snap_in_version_id: 'test-snap-in-version-id',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'test-sync-tier',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'test-worker-data-url'
      },
      event_data: {}
    },
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-token'
      }
    },
    execution_metadata: {
      request_id: 'test-request-id',
      function_name: 'check_authentication',
      event_type: 'test-event-type',
      devrev_endpoint: 'https://api.devrev.ai'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  // Deep merge the overrides
  const mergedEvent = { ...baseEvent };
  if (overrides.payload) {
    mergedEvent.payload = { ...baseEvent.payload, ...overrides.payload };
  }
  if (overrides.context) {
    mergedEvent.context = { ...baseEvent.context, ...overrides.context };
  }
  if (overrides.execution_metadata) {
    mergedEvent.execution_metadata = { ...baseEvent.execution_metadata, ...overrides.execution_metadata };
  }
  if (overrides.input_data) {
    mergedEvent.input_data = { ...baseEvent.input_data, ...overrides.input_data };
  }

  return mergedEvent;
}

// Mock setup utilities
export function setupSuccessfulAuthMock(memberData: Partial<typeof MOCK_MEMBER_DATA> = MOCK_MEMBER_DATA) {
  // Mock parseApiCredentials
  mockedParseApiCredentials.mockReturnValue({
    apiKey: 'test-api-key',
    token: 'test-token'
  });

  // Create mock getMember function
  const mockGetMember = jest.fn().mockResolvedValue({
    data: memberData,
    status_code: 200,
    api_delay: 0,
    message: 'Successfully retrieved member information',
    raw_response: { status: 200, data: memberData }
  });

  // Mock the TrelloClient constructor to return an object with the mocked getMember method
  MockedTrelloClient.mockImplementation(() => ({
    getMember: mockGetMember
  } as any));

  return mockGetMember;
}

export function setupFailedAuthMock(statusCode: number, message: string, apiDelay = 0, headers = {}) {
  // Mock parseApiCredentials
  mockedParseApiCredentials.mockReturnValue({
    apiKey: 'test-api-key',
    token: 'test-token'
  });

  // Create mock getMember function that returns error response
  const mockGetMember = jest.fn().mockResolvedValue({
    status_code: statusCode,
    api_delay: apiDelay,
    message: message,
    raw_response: { status: statusCode, headers: headers }
  });

  // Mock the TrelloClient constructor
  MockedTrelloClient.mockImplementation(() => ({
    getMember: mockGetMember
  } as any));

  return mockGetMember;
}

export function setupRateLimitMock(retryAfter = '60') {
  return setupFailedAuthMock(
    429,
    `Rate limit exceeded. Retry after ${retryAfter} seconds`,
    parseInt(retryAfter, 10),
    { 'retry-after': retryAfter }
  );
}

export function setupParseCredentialsError(errorMessage: string) {
  mockedParseApiCredentials.mockImplementation(() => {
    throw new Error(errorMessage);
  });

  // Still need to mock TrelloClient constructor even though parseApiCredentials will throw
  MockedTrelloClient.mockImplementation(() => ({
    getMember: jest.fn()
  } as any));
}