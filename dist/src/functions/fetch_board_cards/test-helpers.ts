import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

export const mockCards = [
  {
    id: 'card1',
    name: 'Test Card 1',
    desc: 'Test description 1',
    closed: false,
    attachments: []
  },
  {
    id: 'card2',
    name: 'Test Card 2',
    desc: 'Test description 2',
    closed: false,
    attachments: [
      {
        id: 'attachment1',
        name: 'test-attachment.pdf',
        url: 'https://example.com/attachment1'
      }
    ]
  }
];

export const createMockEvent = (overrides: any = {}): FunctionInput => ({
  payload: {
    connection_data: {
      org_id: 'test-org-id',
      org_name: 'test-org-name',
      key: 'key=test-api-key&token=test-token',
      key_type: 'test-key-type'
    },
    event_context: {
      external_sync_unit_id: 'test-board-id',
      callback_url: 'test-callback-url',
      dev_org: 'test-dev-org',
      dev_org_id: 'test-dev-org-id',
      dev_user: 'test-dev-user',
      dev_user_id: 'test-dev-user-id',
      external_sync_unit: 'test-external-sync-unit',
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
    ...overrides.payload
  },
  context: {
    dev_oid: 'test-dev-oid',
    source_id: 'test-source-id',
    snap_in_id: 'test-snap-in-id',
    snap_in_version_id: 'test-snap-in-version-id',
    service_account_id: 'test-service-account-id',
    secrets: {
      service_account_token: 'test-token'
    },
    ...overrides.context
  },
  execution_metadata: {
    request_id: 'test-request-id',
    function_name: 'fetch_board_cards',
    event_type: 'test-event-type',
    devrev_endpoint: 'https://api.devrev.ai',
    ...overrides.execution_metadata
  },
  input_data: {
    global_values: {
      limit: '10'
    },
    event_sources: {},
    ...overrides.input_data
  }
});

export const setupTrelloClientMock = (mockResponse: any) => {
  // Mock the static parseCredentials method
  jest.spyOn(TrelloClient, 'parseCredentials').mockReturnValue({
    apiKey: 'test-api-key',
    token: 'test-token',
  });

  const mockGetBoardCards = jest.fn().mockResolvedValue(mockResponse);

  // Mock the constructor
  (TrelloClient as jest.MockedClass<typeof TrelloClient>).mockImplementation(() => ({
    getBoardCards: mockGetBoardCards,
  } as any));

  return mockGetBoardCards;
};

export const setupTrelloClientParseError = (errorMessage: string) => {
  jest.spyOn(TrelloClient, 'parseCredentials').mockImplementation(() => {
    throw new Error(errorMessage);
  });
};