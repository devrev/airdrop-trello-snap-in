// Mock the required modules
jest.mock('@devrev/ts-adaas', () => ({
  ...jest.requireActual('@devrev/ts-adaas'),
  processTask: jest.fn(),
  axiosClient: {
    get: jest.fn(),
  },
  axios: {
    isAxiosError: jest.fn(),
  },
  serializeAxiosError: jest.fn(),
  ExtractorEventType: {
    ExtractionAttachmentsDone: 'EXTRACTION_ATTACHMENTS_DONE',
    ExtractionAttachmentsError: 'EXTRACTION_ATTACHMENTS_ERROR',
    ExtractionAttachmentsDelay: 'EXTRACTION_ATTACHMENTS_DELAY',
    ExtractionAttachmentsProgress: 'EXTRACTION_ATTACHMENTS_PROGRESS',
  },
}));

jest.mock('../../../core/trello-client');

import {
  processTask,
  ExtractorEventType,
  axiosClient,
  axios,
  serializeAxiosError,
} from '@devrev/ts-adaas';
import { TrelloClient } from '../../../core/trello-client';
import {
  setupMocks,
  createMockAdapter,
  createDelayResponse,
  createErrorResponse,
  expectSuccessfulExtraction,
  expectDelayExtraction,
  expectErrorExtraction,
  expectProgressExtraction,
  expectConsoleError,
} from './attachments-extraction-test-setup';
import {
  runSuccessfulStreamingTest,
  runRateLimitingWithRetryAfterTest,
  runRateLimitingWithHttpDateTest,
  runMissingConnectionDataTest,
  runAxiosErrorsTest,
  runNonAxiosErrorsTest,
  runWarningLogsTest,
} from './attachments-extraction-test-helpers';

// Capture the task and onTimeout functions
let mockTask: any;
let mockOnTimeout: any;

const mockProcessTask = processTask as jest.MockedFunction<typeof processTask>;
mockProcessTask.mockImplementation(({ task, onTimeout }) => {
  mockTask = task;
  mockOnTimeout = onTimeout;
});

const mockAxiosClient = axiosClient as jest.Mocked<typeof axiosClient>;
const mockAxios = axios as jest.Mocked<typeof axios>;
const mockSerializeAxiosError = serializeAxiosError as jest.MockedFunction<typeof serializeAxiosError>;

describe('attachments-extraction worker', () => {
  let mockAdapter: any;

  beforeEach(() => {
    setupMocks();
    mockAdapter = createMockAdapter();

    // Import the worker to trigger processTask
    require('./attachments-extraction');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('task function', () => {
    it('should successfully stream attachments and emit done event', async () => {
      mockAdapter.streamAttachments.mockResolvedValue({});

      await mockTask({ adapter: mockAdapter });

      expect(mockAdapter.streamAttachments).toHaveBeenCalledWith({
        stream: expect.any(Function),
      });
      expectSuccessfulExtraction(mockAdapter);
    });

    it('should handle delay response and emit delay event', async () => {
      const delayResponse = createDelayResponse(30);
      mockAdapter.streamAttachments.mockResolvedValue(delayResponse);

      await mockTask({ adapter: mockAdapter });

      expectDelayExtraction(mockAdapter, 30);
    });

    it('should handle error response and emit error event', async () => {
      const errorResponse = createErrorResponse('Stream error');
      mockAdapter.streamAttachments.mockResolvedValue(errorResponse);

      await mockTask({ adapter: mockAdapter });

      expectErrorExtraction(mockAdapter, 'Stream error');
    });

    it('should handle streamAttachments throwing an error', async () => {
      const testError = new Error('Stream failed');
      mockAdapter.streamAttachments.mockRejectedValue(testError);

      await mockTask({ adapter: mockAdapter });

      expectErrorExtraction(mockAdapter, 'Stream failed');
    });

    it('should handle unknown errors', async () => {
      mockAdapter.streamAttachments.mockRejectedValue('string error');

      await mockTask({ adapter: mockAdapter });

      expectErrorExtraction(mockAdapter, 'Unknown error occurred during attachments extraction');
    });

    it('should log errors when they occur', async () => {
      const consoleSpy = expectConsoleError('Test error');
      const testError = new Error('Test error');
      mockAdapter.streamAttachments.mockRejectedValue(testError);

      await mockTask({ adapter: mockAdapter });

      expect(consoleSpy).toHaveBeenCalledWith('An error occurred while processing attachments extraction task:', {
        error_message: 'Test error',
        error_stack: expect.any(String),
        timestamp: expect.any(String),
      });
    });
  });

  describe('onTimeout function', () => {
    it('should emit progress event on timeout', async () => {
      await mockOnTimeout({ adapter: mockAdapter });

      expectProgressExtraction(mockAdapter);
    });

    it('should log timeout error', async () => {
      const consoleSpy = expectConsoleError('Attachments extraction timeout');

      await mockOnTimeout({ adapter: mockAdapter });

      expect(consoleSpy).toHaveBeenCalledWith('Attachments extraction timeout');
    });

    it('should handle errors in timeout handler', async () => {
      const consoleSpy = expectConsoleError('Emit error');
      const testError = new Error('Emit error');
      mockAdapter.emit.mockRejectedValue(testError);

      await mockOnTimeout({ adapter: mockAdapter });

      expect(consoleSpy).toHaveBeenCalledWith('Error handling timeout in attachments extraction:', {
        error_message: 'Emit error',
        error_stack: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('should handle unknown errors in timeout handler', async () => {
      const consoleSpy = expectConsoleError('string error');
      mockAdapter.emit.mockRejectedValue('string error');

      await mockOnTimeout({ adapter: mockAdapter });

      expect(consoleSpy).toHaveBeenCalledWith('Error handling timeout in attachments extraction:', {
        error_message: 'Unknown error',
        error_stack: undefined,
        timestamp: expect.any(String),
      });
    });
  });

  describe('getAttachmentStream function (integration test)', () => {
    it('should handle successful attachment streaming with OAuth', async () => {
      await runSuccessfulStreamingTest(mockTask, mockAdapter, mockAxiosClient);
    });

    it('should handle rate limiting with retry-after header', async () => {
      await runRateLimitingWithRetryAfterTest(mockTask, mockAdapter, mockAxiosClient);
    });

    it('should handle rate limiting with HTTP date retry-after header', async () => {
      await runRateLimitingWithHttpDateTest(mockTask, mockAdapter, mockAxiosClient);
    });

    it('should handle missing connection data', async () => {
      await runMissingConnectionDataTest(mockTask, mockAdapter);
    });

    it('should handle axios errors', async () => {
      await runAxiosErrorsTest(mockTask, mockAdapter, mockAxiosClient, mockAxios, mockSerializeAxiosError);
    });

    it('should handle non-axios errors', async () => {
      await runNonAxiosErrorsTest(mockTask, mockAdapter, mockAxiosClient, mockAxios, mockSerializeAxiosError);
    });

    it('should log warnings for failed attachments', async () => {
      await runWarningLogsTest(mockTask, mockAdapter, mockAxiosClient, mockAxios, mockSerializeAxiosError);
    });
  });
});