import { run, DownloadAttachmentResult } from './index';
import {
  createMockEvent,
  setupSuccessfulDownload,
  setupFailedDownload,
  setupRateLimitMock,
  MOCK_ATTACHMENT_DATA,
  MockedTrelloClient,
  mockedParseApiCredentials
} from './test-helpers';

// Import the module to ensure mocks are applied
jest.mock('../../core/trello-client');

describe('download_attachment function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.TRELLO_BASE_URL = 'https://api.trello.com/1';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should successfully download an attachment with valid parameters', async () => {
    const mockEvent = createMockEvent();
    const mockDownloadAttachment = setupSuccessfulDownload();

    const result: DownloadAttachmentResult = await run([mockEvent]);

    expect(mockedParseApiCredentials).toHaveBeenCalledWith('key=test-api-key&token=test-token');
    expect(MockedTrelloClient).toHaveBeenCalledWith({
      baseUrl: 'https://api.trello.com/1',
      apiKey: 'test-api-key',
      token: 'test-token'
    });
    expect(mockDownloadAttachment).toHaveBeenCalledWith('card123', 'att456', 'test-file.pdf');
    expect(result).toEqual({
      success: true,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully downloaded attachment: test-file.pdf',
      raw_response: { status: 200, data: MOCK_ATTACHMENT_DATA },
      attachment_data: 'base64encodedcontent',
      content_type: 'application/pdf'
    });
  });

  it('should handle authentication failure with 401 status', async () => {
    const mockEvent = createMockEvent();
    const mockDownloadAttachment = setupFailedDownload(401, 'Authentication failed. Invalid API key or token');

    const result: DownloadAttachmentResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 401,
      api_delay: 0,
      message: 'Authentication failed. Invalid API key or token',
      raw_response: { status: 401, headers: {} },
      attachment_data: undefined,
      content_type: undefined
    });
  });

  it('should handle rate limiting with 429 status', async () => {
    const mockEvent = createMockEvent();
    const mockDownloadAttachment = setupRateLimitMock('60');

    const result: DownloadAttachmentResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 429,
      api_delay: 60,
      message: 'Rate limit exceeded. Retry after 60 seconds',
      raw_response: { status: 429, headers: { 'retry-after': '60' } },
      attachment_data: undefined,
      content_type: undefined
    });
  });

  it('should return error when no events are provided', async () => {
    const result: DownloadAttachmentResult = await run([]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Download attachment failed: No events provided',
      raw_response: null
    });
  });

  it('should return error when TRELLO_BASE_URL is not set', async () => {
    delete process.env.TRELLO_BASE_URL;
    const mockEvent = createMockEvent();

    const result: DownloadAttachmentResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Download attachment failed: TRELLO_BASE_URL environment variable not set',
      raw_response: null
    });
  });

  it('should return error when connection data is missing', async () => {
    const mockEvent = createMockEvent({
      payload: {
        connection_data: undefined
      }
    });

    const result: DownloadAttachmentResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Download attachment failed: Missing connection data or API key',
      raw_response: null
    });
  });

  it('should return error when idCard parameter is missing', async () => {
    const mockEvent = createMockEvent({
      input_data: {
        event_sources: {},
        global_values: {
          idCard: '',
          idAttachment: 'att456',
          fileName: 'test-file.pdf'
        }
      }
    });

    const result: DownloadAttachmentResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Download attachment failed: Missing idCard parameter',
      raw_response: null
    });
  });

  it('should return error when idAttachment parameter is missing', async () => {
    const mockEvent = createMockEvent({
      input_data: {
        event_sources: {},
        global_values: {
          idCard: 'card123',
          idAttachment: '',
          fileName: 'test-file.pdf'
        }
      }
    });

    const result: DownloadAttachmentResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Download attachment failed: Missing idAttachment parameter',
      raw_response: null
    });
  });

  it('should return error when fileName parameter is missing', async () => {
    const mockEvent = createMockEvent({
      input_data: {
        event_sources: {},
        global_values: {
          idCard: 'card123',
          idAttachment: 'att456',
          fileName: ''
        }
      }
    });

    const result: DownloadAttachmentResult = await run([mockEvent]);

    expect(result).toEqual({
      success: false,
      status_code: 0,
      api_delay: 0,
      message: 'Download attachment failed: Missing fileName parameter',
      raw_response: null
    });
  });
});