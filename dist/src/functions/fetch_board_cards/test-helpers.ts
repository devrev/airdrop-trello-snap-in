import { FunctionInput } from '../../core/types';
import { TrelloClient, parseApiCredentials } from '../../core/trello-client';

// Mock the entire trello-client module
jest.mock('../../core/trello-client', () => {
  // Store original module
  const originalModule = jest.requireActual('../../core/trello-client');
  
  // Create mock functions
  const mockParseApiCredentials = jest.fn();
  const mockGetBoardCards = jest.fn();
  
  // Create mock TrelloClient class
  const MockTrelloClient = jest.fn().mockImplementation(() => ({
    getBoardCards: mockGetBoardCards
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
export const MOCK_CARDS = [
  {
    id: 'card1',
    name: 'Test Card 1',
    desc: 'Description for card 1',
    idBoard: 'board1',
    idList: 'list1',
    url: 'https://trello.com/c/abc123/test-card-1',
    attachments: [
      {
        id: 'att1',
        name: 'attachment1.pdf',
        url: 'https://trello.com/attachment/abc123',
        date: '2025-06-06T06:08:05.912Z'
      }
    ]
  },
  {
    id: 'card2',
    name: 'Test Card 2',
    desc: 'Description for card 2',
    idBoard: 'board1',
    idList: 'list2',
    url: 'https://trello.com/c/def456/test-card-2',
    attachments: []
  }
];

// Create mock event
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
        external_sync_unit_id: 'board1',
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
      function_name: 'fetch_board_cards',
      event_type: 'test-event-type',
      devrev_endpoint: 'https://api.devrev.ai'
    },
    input_data: {
      global_values: {
        limit: '100',
        before: 'card123'
      },
      event_sources: {}
    }
  };

  // Deep merge the overrides
  const mergedEvent = { ...baseEvent };
  if (overrides.payload) {
    mergedEvent.payload = { ...baseEvent.payload, ...overrides.payload };
    
    // Handle event_context separately to allow complete replacement
    if (overrides.payload.event_context !== undefined) {
      mergedEvent.payload.event_context = {
        ...baseEvent.payload.event_context,
        ...overrides.payload.event_context
      };
    }
  }
  
  if (overrides.context) {
    mergedEvent.context = { ...baseEvent.context, ...overrides.context };
  }
  if (overrides.execution_metadata) {
    mergedEvent.execution_metadata = { ...baseEvent.execution_metadata, ...overrides.execution_metadata };
  }
  
  if (overrides.input_data) {
    mergedEvent.input_data = { 
      ...baseEvent.input_data,
      event_sources: overrides.input_data.event_sources || baseEvent.input_data.event_sources || {},
      global_values: { ...baseEvent.input_data.global_values }
    };
    
    // Handle global_values separately
    if (overrides.input_data.global_values !== undefined) {
      mergedEvent.input_data.global_values = overrides.input_data.global_values === null ? {} : {
        ...baseEvent.input_data.global_values,
        ...overrides.input_data.global_values
      };
    }
  }

  return mergedEvent;
}

// Mock setup utilities
export function setupSuccessfulCardsFetch() {
  // Mock parseApiCredentials
  mockedParseApiCredentials.mockReturnValue({
    apiKey: 'test-api-key',
    token: 'test-token'
  });

  // Create mock getBoardCards function
  const mockGetBoardCards = jest.fn().mockResolvedValue({
    data: MOCK_CARDS,
    status_code: 200,
    api_delay: 0,
    message: 'Successfully retrieved board cards',
    raw_response: { status: 200, data: MOCK_CARDS }
  });

  // Mock the TrelloClient constructor
  MockedTrelloClient.mockImplementation(() => ({
    getBoardCards: mockGetBoardCards
  } as any));

  return mockGetBoardCards;
}

export function setupFailedCardsFetch(statusCode: number, message: string, apiDelay = 0, headers = {}) {
  // Mock parseApiCredentials
  mockedParseApiCredentials.mockReturnValue({
    apiKey: 'test-api-key',
    token: 'test-token'
  });

  // Create mock getBoardCards function that returns error response
  const mockGetBoardCards = jest.fn().mockResolvedValue({
    status_code: statusCode,
    api_delay: apiDelay,
    message: message,
    raw_response: { status: statusCode, headers: headers }
  });

  // Mock the TrelloClient constructor
  MockedTrelloClient.mockImplementation(() => ({
    getBoardCards: mockGetBoardCards
  } as any));

  return mockGetBoardCards;
}

export function setupRateLimitMock(retryAfter = '60') {
  return setupFailedCardsFetch(
    429,
    `Rate limit exceeded. Retry after ${retryAfter} seconds`,
    parseInt(retryAfter, 10),
    { 'retry-after': retryAfter }
  );
}