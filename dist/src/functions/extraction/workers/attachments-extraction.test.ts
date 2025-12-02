import { ExtractorEventType } from '@devrev/ts-adaas';
import { TrelloClient, parseConnectionData } from '../../../core/trello-client';

// Mock the TrelloClient
jest.mock('../../../core/trello-client', () => {
  const mockDownloadAttachment = jest.fn();
  const mockTrelloClient = jest.fn().mockImplementation(() => ({
    downloadAttachment: mockDownloadAttachment,
  }));

  return {
    TrelloClient: mockTrelloClient,
    parseConnectionData: jest.fn((key: string) => {
      const params = new URLSearchParams(key);
      return {
        apiKey: params.get('key') || '',
        token: params.get('token') || '',
      };
    }),
    __mockDownloadAttachment: mockDownloadAttachment,
  };
});

// Mock axios
jest.mock('@devrev/ts-adaas', () => {
  const actual = jest.requireActual('@devrev/ts-adaas');
  return {
    ...actual,
    axiosClient: {
      get: jest.fn(),
    },
    axios: {
      isAxiosError: jest.fn(),
    },
    serializeAxiosError: jest.fn((error) => error.message),
    processTask: jest.fn(({ task, onTimeout }) => {
      (global as any).__testTask = task;
      (global as any).__testOnTimeout = onTimeout;
    }),
  };
});

const { __mockDownloadAttachment } = require('../../../core/trello-client');
const { axiosClient, axios: axiosMock } = require('@devrev/ts-adaas');

describe('attachments-extraction worker', () => {
  let mockAdapter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdapter = {
      event: {
        payload: {
          connection_data: {
            key: 'key=test-api-key&token=test-token',
          },
        },
      },
      streamAttachments: jest.fn(),
      emit: jest.fn(),
    };

    __mockDownloadAttachment.mockReset();
    axiosClient.get.mockReset();
    axiosMock.isAxiosError.mockReset();
  });

  it('should successfully stream Trello attachments', async () => {
    const mockStream = { data: 'mock-stream' };

    __mockDownloadAttachment.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully downloaded attachment',
      data: mockStream,
    });

    mockAdapter.streamAttachments.mockResolvedValue(undefined);

    // Load the worker to register the task
    require('./attachments-extraction');

    const task = (global as any).__testTask;
    expect(task).toBeDefined();

    await task({ adapter: mockAdapter });

    // Verify streamAttachments was called
    expect(mockAdapter.streamAttachments).toHaveBeenCalledWith({
      stream: expect.any(Function),
    });

    // Verify completion event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionAttachmentsDone);
  });

  it('should handle rate limiting when downloading attachments', async () => {
    __mockDownloadAttachment.mockResolvedValue({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded',
    });

    mockAdapter.streamAttachments.mockResolvedValue({ delay: 30 });

    // Load the worker to register the task
    require('./attachments-extraction');

    const task = (global as any).__testTask;

    await task({ adapter: mockAdapter });

    // Verify delay event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionAttachmentsDelay, {
      delay: 30,
    });
  });

  it('should handle errors when downloading attachments', async () => {
    __mockDownloadAttachment.mockResolvedValue({
      status_code: 500,
      api_delay: 0,
      message: 'Internal server error',
    });

    mockAdapter.streamAttachments.mockResolvedValue({
      error: { message: 'Error downloading attachment' },
    });

    // Load the worker to register the task
    require('./attachments-extraction');

    const task = (global as any).__testTask;

    await task({ adapter: mockAdapter });

    // Verify error event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionAttachmentsError, {
      error: { message: 'Error downloading attachment' },
    });
  });

  it('should handle external URLs without OAuth', async () => {
    const mockStream = { data: 'mock-stream' };

    axiosClient.get.mockResolvedValue(mockStream);
    mockAdapter.streamAttachments.mockResolvedValue(undefined);

    // Load the worker to register the task
    require('./attachments-extraction');

    const task = (global as any).__testTask;

    await task({ adapter: mockAdapter });

    // Get the stream function
    const streamFunction = mockAdapter.streamAttachments.mock.calls[0][0].stream;

    // Test with external URL
    const result = await streamFunction({
      item: {
        id: 'att123',
        url: 'https://example.com/file.pdf',
        parent_id: 'card123',
      },
      event: mockAdapter.event,
    });

    expect(result).toEqual({ httpStream: mockStream });
    expect(axiosClient.get).toHaveBeenCalledWith('https://example.com/file.pdf', {
      responseType: 'stream',
      headers: {
        'Accept-Encoding': 'identity',
      },
    });
  });

  it('should handle Trello URLs with OAuth', async () => {
    const mockStream = { data: 'mock-stream' };

    __mockDownloadAttachment.mockResolvedValue({
      status_code: 200,
      api_delay: 0,
      message: 'Successfully downloaded attachment',
      data: mockStream,
    });

    mockAdapter.streamAttachments.mockResolvedValue(undefined);

    // Load the worker to register the task
    require('./attachments-extraction');

    const task = (global as any).__testTask;

    await task({ adapter: mockAdapter });

    // Get the stream function
    const streamFunction = mockAdapter.streamAttachments.mock.calls[0][0].stream;

    // Test with Trello URL
    const result = await streamFunction({
      item: {
        id: 'att123',
        url: 'https://api.trello.com/1/cards/card123/attachments/att123/download/file.pdf',
        parent_id: 'card123',
      },
      event: mockAdapter.event,
    });

    expect(result).toEqual({ httpStream: mockStream });
    expect(__mockDownloadAttachment).toHaveBeenCalledWith('card123', 'att123', 'file.pdf');
  });

  it('should handle timeout correctly', async () => {
    // Load the worker to register the task
    require('./attachments-extraction');

    const onTimeoutHandler = (global as any).__testOnTimeout;
    expect(onTimeoutHandler).toBeDefined();

    await onTimeoutHandler({ adapter: mockAdapter });

    // Verify progress event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(
      ExtractorEventType.ExtractionAttachmentsProgress,
      {
        progress: 50,
      }
    );
  });

  it('should handle missing connection data', async () => {
    mockAdapter.event.payload.connection_data.key = '';
    mockAdapter.streamAttachments.mockResolvedValue(undefined);

    // Load the worker to register the task
    require('./attachments-extraction');

    const task = (global as any).__testTask;

    await task({ adapter: mockAdapter });

    // Get the stream function
    const streamFunction = mockAdapter.streamAttachments.mock.calls[0][0].stream;

    // Test with missing connection data
    const result = await streamFunction({
      item: {
        id: 'att123',
        url: 'https://api.trello.com/1/cards/card123/attachments/att123/download/file.pdf',
        parent_id: 'card123',
      },
      event: mockAdapter.event,
    });

    expect(result).toEqual({
      error: {
        message: 'Missing connection data for attachment att123',
      },
    });
  });

  it('should handle axios errors', async () => {
    const axiosError = new Error('Network error');
    axiosMock.isAxiosError.mockReturnValue(true);
    axiosClient.get.mockRejectedValue(axiosError);

    mockAdapter.streamAttachments.mockResolvedValue(undefined);

    // Load the worker to register the task
    require('./attachments-extraction');

    const task = (global as any).__testTask;

    await task({ adapter: mockAdapter });

    // Get the stream function
    const streamFunction = mockAdapter.streamAttachments.mock.calls[0][0].stream;

    // Test with external URL that throws error
    const result = await streamFunction({
      item: {
        id: 'att123',
        url: 'https://example.com/file.pdf',
        parent_id: 'card123',
      },
      event: mockAdapter.event,
    });

    expect(result).toEqual({
      error: {
        message: 'Error while fetching attachment att123 from URL.',
      },
    });
  });

  it('should handle general errors during streaming', async () => {
    mockAdapter.streamAttachments.mockRejectedValue(new Error('Streaming failed'));

    // Load the worker to register the task
    require('./attachments-extraction');

    const task = (global as any).__testTask;

    await task({ adapter: mockAdapter });

    // Verify error event was emitted
    expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionAttachmentsError, {
      error: {
        message: 'Streaming failed',
      },
    });
  });
});