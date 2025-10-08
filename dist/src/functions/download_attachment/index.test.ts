import { run } from './index';
import { TrelloClient } from '../../core/trello-client';
import { 
  mockAttachmentData, 
  createMockEvent, 
  setupTrelloClientMock, 
  setupTrelloClientParseError 
} from './test-helpers';

// Mock the TrelloClient
jest.mock('../../core/trello-client');

describe('download_attachment function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return attachment data when API call succeeds', async () => {
    const mockDownloadAttachment = setupTrelloClientMock({
      data: mockAttachmentData,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully downloaded attachment from Trello API',
    });

    const result = await run([createMockEvent()]);

    expect(result).toEqual({
      attachment_data: mockAttachmentData,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully downloaded attachment from Trello API',
    });
    expect(mockDownloadAttachment).toHaveBeenCalledWith('test-card-id', 'test-attachment-id', 'test-file.pdf');
  });

  it('should handle API call failure with 401', async () => {
    setupTrelloClientMock({
      status_code: 401,
      api_delay: 0,
      message: 'Authentication failed. Invalid API key or token',
    });

    const result = await run([createMockEvent()]);

    expect(result).toEqual({
      status_code: 401,
      api_delay: 0,
      message: 'Authentication failed. Invalid API key or token',
    });
    expect(result.attachment_data).toBeUndefined();
  });

  it('should handle API call failure with 404', async () => {
    setupTrelloClientMock({
      status_code: 404,
      api_delay: 0,
      message: 'Resource not found',
    });

    const result = await run([createMockEvent()]);

    expect(result).toEqual({
      status_code: 404,
      api_delay: 0,
      message: 'Resource not found',
    });
  });

  it('should handle rate limiting with proper api_delay', async () => {
    setupTrelloClientMock({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded. Retry after 30 seconds',
    });

    const result = await run([createMockEvent()]);

    expect(result).toEqual({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded. Retry after 30 seconds',
    });
  });

  it('should return error when no events are provided', async () => {
    const result = await run([]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Download attachment failed: No events provided',
    });
  });

  it('should return error when connection data is missing', async () => {
    const eventWithoutConnectionData = {
      ...createMockEvent(),
      payload: {}
    };

    const result = await run([eventWithoutConnectionData]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Download attachment failed: Missing connection data',
    });
  });

  it('should return error when idCard parameter is missing', async () => {
    const eventWithoutIdCard = createMockEvent({
      input_data: {
        global_values: {
          idAttachment: 'test-attachment-id',
          fileName: 'test-file.pdf'
        }
      }
    });

    const result = await run([eventWithoutIdCard]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Download attachment failed: Missing required idCard parameter',
    });
  });

  it('should return error when idAttachment parameter is missing', async () => {
    const eventWithoutIdAttachment = createMockEvent({
      input_data: {
        global_values: {
          idCard: 'test-card-id',
          fileName: 'test-file.pdf'
        }
      }
    });

    const result = await run([eventWithoutIdAttachment]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Download attachment failed: Missing required idAttachment parameter',
    });
  });

  it('should return error when fileName parameter is missing', async () => {
    const eventWithoutFileName = createMockEvent({
      input_data: {
        global_values: {
          idCard: 'test-card-id',
          idAttachment: 'test-attachment-id'
        }
      }
    });

    const result = await run([eventWithoutFileName]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Download attachment failed: Missing required fileName parameter',
    });
  });

  it('should return error when credentials parsing fails', async () => {
    setupTrelloClientParseError('Invalid connection data: missing API key or token');

    const eventWithInvalidKey = createMockEvent({
      payload: {
        connection_data: {
          key: 'invalid-format'
        }
      }
    });

    const result = await run([eventWithInvalidKey]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Download attachment failed: Invalid connection data: missing API key or token',
    });
  });

  it('should handle undefined events array', async () => {
    // @ts-ignore - Testing invalid input
    const result = await run(undefined);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Download attachment failed: No events provided',
    });
  });

  it('should handle network errors', async () => {
    setupTrelloClientMock({
      status_code: 0,
      api_delay: 0,
      message: 'Network error: Unable to reach Trello API',
    });

    const result = await run([createMockEvent()]);

    expect(result).toEqual({
      status_code: 0,
      api_delay: 0,
      message: 'Network error: Unable to reach Trello API',
    });
  });
});