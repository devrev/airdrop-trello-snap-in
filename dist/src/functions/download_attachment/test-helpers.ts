import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

export const mockAttachmentData = new ArrayBuffer(1024); // Mock binary data

export const createMockEvent = (overrides: any = {}): FunctionInput => ({
  payload: {
    connection_data: {
      org_id: 'test-org-id',
      org_name: 'test-org-name',
      key: 'key=test-api-key&token=test-token',
      key_type: 'test-key-type'
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
    function_name: 'download_attachment',
    event_type: 'test-event-type',
    devrev_endpoint: 'https://api.devrev.ai',
    ...overrides.execution_metadata
  },
  input_data: {
    global_values: {
      idCard: 'test-card-id',
      idAttachment: 'test-attachment-id',
      fileName: 'test-file.pdf'
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

  const mockDownloadAttachment = jest.fn().mockResolvedValue(mockResponse);

  // Mock the constructor
  (TrelloClient as jest.MockedClass<typeof TrelloClient>).mockImplementation(() => ({
    downloadAttachment: mockDownloadAttachment,
  } as any));

  return mockDownloadAttachment;
};

export const setupTrelloClientParseError = (errorMessage: string) => {
  jest.spyOn(TrelloClient, 'parseCredentials').mockImplementation(() => {
    throw new Error(errorMessage);
  });
};