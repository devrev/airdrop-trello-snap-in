// Mock the TrelloClient module before importing
jest.mock('../../core/trello-client');

import run from './index';
import { TrelloClient } from '../../core/trello-client';
import {
  setupMockTrelloClient,
  createMockEvent,
  setupConsoleSpies,
  clearAllMocks,
  expectSuccessResponse,
  expectFailureResponse,
} from './test-setup';
import {
  successfulDownloadResponse,
  authFailureResponse,
  rateLimitResponse,
  notFoundResponse,
  createInvalidInputTestCases,
  createInvalidEventTestCases,
} from './test-data';
import {
  createDownloadTestScenarios,
  validateSuccessResponseStructure,
  validateFailureResponseStructure,
} from './test-helpers';

describe('download_attachment function', () => {
  let mockTrelloClientInstance: jest.Mocked<TrelloClient>;

  beforeEach(() => {
    clearAllMocks();
    setupConsoleSpies();
    mockTrelloClientInstance = setupMockTrelloClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return success response with attachment data', async () => {
    mockTrelloClientInstance.downloadAttachment.mockResolvedValue(successfulDownloadResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectSuccessResponse(result, {
      file_data: 'base64-encoded-file-content',
      file_name: 'test-file.pdf',
      content_type: 'application/pdf',
    });
  });

  it('should return failure response for invalid authentication', async () => {
    mockTrelloClientInstance.downloadAttachment.mockResolvedValue(authFailureResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 401, 'Authentication failed - invalid API key or token');
  });

  it('should handle rate limiting correctly', async () => {
    mockTrelloClientInstance.downloadAttachment.mockResolvedValue(rateLimitResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 429, 'Rate limit exceeded - retry after 60 seconds', 60);
  });

  it('should handle attachment not found error', async () => {
    mockTrelloClientInstance.downloadAttachment.mockResolvedValue(notFoundResponse);

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 404, 'Card, attachment, or file not found');
  });

  describe('download response scenarios', () => {
    const scenarios = createDownloadTestScenarios();

    it(scenarios.serverError.description, async () => {
      mockTrelloClientInstance.downloadAttachment.mockResolvedValue(scenarios.serverError.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 500, 'Trello API server error');
    });

    it(scenarios.successWithoutData.description, async () => {
      mockTrelloClientInstance.downloadAttachment.mockResolvedValue(scenarios.successWithoutData.mockResponse);

      const mockEvent = createMockEvent();
      const result = await run([mockEvent]);

      validateFailureResponseStructure(result, 200, 'Success but no data');
    });
  });

  describe('input validation', () => {
    const testCases = createInvalidInputTestCases();
    
    testCases.forEach(({ input, expectedMessage }) => {
      it(`should handle invalid input: ${JSON.stringify(input)}`, async () => {
        const result = await run(input as any);
        expectFailureResponse(result, 500, expectedMessage);
      });
    });
  });

  describe('event validation', () => {
    const testCases = createInvalidEventTestCases();
    
    testCases.forEach(({ name, eventModifier, expectedMessage }) => {
      it(`should handle ${name}`, async () => {
        const mockEvent = createMockEvent();
        const invalidEvent = eventModifier(mockEvent);
        const result = await run([invalidEvent as any]);
        expectFailureResponse(result, 500, expectedMessage);
      });
    });
  });

  it('should handle TrelloClient creation errors', async () => {
    jest.spyOn(TrelloClient, 'fromConnectionData').mockImplementation(() => {
      throw new Error('Invalid connection data format');
    });

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 500, 'Invalid connection data format');
  });

  it('should handle API call errors', async () => {
    mockTrelloClientInstance.downloadAttachment.mockRejectedValue(new Error('Network error'));

    const mockEvent = createMockEvent();
    const result = await run([mockEvent]);

    expectFailureResponse(result, 500, 'Network error');
  });

  it('should process only the first event when multiple events are provided', async () => {
    mockTrelloClientInstance.downloadAttachment.mockResolvedValue(successfulDownloadResponse);

    const mockEvent1 = createMockEvent('key=api-key-1&token=token-1', 'card-1', 'att-1', 'file1.pdf');
    const mockEvent2 = createMockEvent('key=api-key-2&token=token-2', 'card-2', 'att-2', 'file2.pdf');

    const result = await run([mockEvent1, mockEvent2]);

    expect(mockTrelloClientInstance.downloadAttachment).toHaveBeenCalledTimes(1);
    expect(mockTrelloClientInstance.downloadAttachment).toHaveBeenCalledWith('card-1', 'att-1', 'file1.pdf');
    expectSuccessResponse(result);
  });

  it('should log error details when errors occur', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    const result = await run([]);

    expect(consoleSpy).toHaveBeenCalledWith('Download attachment function error:', {
      error_message: 'Invalid input: events array cannot be empty',
      error_stack: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('should handle unknown errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    const mockEvent = createMockEvent();
    Object.defineProperty(mockEvent, 'payload', {
      get: () => {
        throw 'string error'; // Non-Error object
      }
    });

    const result = await run([mockEvent]);

    expectFailureResponse(result, 500, 'Unknown error occurred during attachment download');
    expect(consoleSpy).toHaveBeenCalledWith('Download attachment function error:', {
      error_message: 'Unknown error',
      error_stack: undefined,
      timestamp: expect.any(String),
    });
  });

  it('should call downloadAttachment with correct parameters', async () => {
    mockTrelloClientInstance.downloadAttachment.mockResolvedValue(successfulDownloadResponse);

    const mockEvent = createMockEvent('key=test&token=test', 'card-123', 'att-456', 'document.pdf');
    
    await run([mockEvent]);

    expect(mockTrelloClientInstance.downloadAttachment).toHaveBeenCalledWith('card-123', 'att-456', 'document.pdf');
  });
});