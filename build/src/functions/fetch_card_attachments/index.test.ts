import { fetch_card_attachments } from './index';
import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello_client';

// Mock the TrelloClient
jest.mock('../../core/trello_client');

describe('fetch_card_attachments function', () => {
  // Mock function input
  const mockFunctionInput: FunctionInput = {
    payload: {
      connection_data: {
        key: 'key=test_api_key&token=test_token',
      },
      card_id: 'test_card_id'
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
      function_name: 'fetch_card_attachments',
      event_type: 'test-event-type',
      devrev_endpoint: 'https://api.devrev.ai/'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success with attachments when fetching is successful', async () => {
    // Arrange
    const mockAttachments = [
      {
        id: 'att1',
        name: 'document.pdf',
        url: 'https://trello.com/1/cards/test_card_id/attachments/att1/download/document.pdf',
        mimeType: 'application/pdf',
        date: '2023-08-15T14:30:00Z',
        bytes: 12345,
        isUpload: true,
        idMember: 'member1'
      },
      {
        id: 'att2',
        name: 'image.png',
        url: 'https://trello.com/1/cards/test_card_id/attachments/att2/download/image.png',
        mimeType: 'image/png',
        date: '2023-08-10T09:15:00Z',
        bytes: 54321,
        isUpload: true,
        idMember: 'member2'
      }
    ];
    
    // Mock the getCardAttachments method to return a successful response
    (TrelloClient as jest.Mock).mockImplementation(() => ({
      getCardAttachments: jest.fn().mockResolvedValue(mockAttachments)
    }));
    
    const events = [mockFunctionInput];
    const consoleSpy = jest.spyOn(console, 'log');

    // Act
    const result = await fetch_card_attachments(events);

    // Assert
    expect(result).toEqual({
      status: 'success',
      message: 'Successfully fetched 2 attachments from card',
      attachments: [
        {
          id: 'att1',
          name: 'document.pdf',
          url: 'https://trello.com/1/cards/test_card_id/attachments/att1/download/document.pdf',
          mime_type: 'application/pdf',
          date_created: '2023-08-15T14:30:00Z',
          bytes: 12345,
          is_upload: true,
          member_id: 'member1'
        },
        {
          id: 'att2',
          name: 'image.png',
          url: 'https://trello.com/1/cards/test_card_id/attachments/att2/download/image.png',
          mime_type: 'image/png',
          date_created: '2023-08-10T09:15:00Z',
          bytes: 54321,
          is_upload: true,
          member_id: 'member2'
        }
      ]
    });
    expect(consoleSpy).toHaveBeenCalledWith('Fetch card attachments function invoked with request ID: test-request-id');
    expect(consoleSpy).toHaveBeenCalledWith('Successfully fetched 2 attachments from card test_card_id');
    expect(TrelloClient).toHaveBeenCalledWith(mockFunctionInput);
  });

  it('should return error when fetching attachments fails', async () => {
    // Arrange
    const errorMessage = 'API rate limit exceeded';
    
    // Mock the getCardAttachments method to throw an error
    (TrelloClient as jest.Mock).mockImplementation(() => ({
      getCardAttachments: jest.fn().mockRejectedValue(new Error(errorMessage))
    }));
    
    const events = [mockFunctionInput];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await fetch_card_attachments(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: `Failed to fetch card attachments: ${errorMessage}`
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when no events are provided', async () => {
    // Arrange
    const events: FunctionInput[] = [];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await fetch_card_attachments(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: 'Failed to fetch card attachments: No events provided to the function'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return error when card ID is missing', async () => {
    // Arrange
    const eventWithoutCardId = {
      ...mockFunctionInput,
      payload: {
        ...mockFunctionInput.payload,
        card_id: undefined
      }
    };
    
    const events = [eventWithoutCardId];
    const consoleErrorSpy = jest.spyOn(console, 'error');

    // Act
    const result = await fetch_card_attachments(events);

    // Assert
    expect(result).toEqual({
      status: 'error',
      message: 'Failed to fetch card attachments: Card ID not found in payload'
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});