import {
  processTask,
  ExtractorEventType,
  axiosClient,
  axios,
  serializeAxiosError,
} from '@devrev/ts-adaas';
import { TrelloClient } from '../../../core/trello-client';

/**
 * Test setup utilities for attachments-extraction tests
 */

// Mock setup functions
export const setupMocks = () => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});

  // Mock TrelloClient.parseConnectionData
  jest.spyOn(TrelloClient, 'parseConnectionData').mockReturnValue({
    apiKey: 'test-api-key',
    token: 'test-token',
  });
};

export const createMockAdapter = () => ({
  streamAttachments: jest.fn(),
  emit: jest.fn().mockResolvedValue(undefined),
});

// Mock response factories
export const createSuccessfulStreamResponse = () => ({
  status: 200,
  data: 'stream-data',
  headers: {},
});

export const createRateLimitResponse = (retryAfter: string | number) => ({
  status: 429,
  headers: { 'retry-after': retryAfter },
});

export const createDelayResponse = (delay: number) => ({ delay });

export const createErrorResponse = (message: string) => ({
  error: { message },
});

// Test data factories
export const createTestItem = (id: string = 'att-123', url: string = 'https://api.trello.com/1/cards/card-123/attachments/att-123/download/file.pdf') => ({
  id,
  url,
});

export const createTestEvent = (connectionData: any = { key: 'key=test-api-key&token=test-token' }) => ({
  payload: {
    connection_data: connectionData,
  },
});

export const createAxiosError = (message: string = 'Network error') => {
  const error = new Error(message);
  return error;
};

export const createSerializedAxiosError = () => ({
  config: { method: 'GET', params: {}, url: 'https://example.com/file.pdf' },
  isAxiosError: true,
  isCorsOrNoNetworkError: false,
  response: { data: 'error', headers: {}, status: 500, statusText: 'Internal Server Error' }
});

// Assertion helpers
export const expectSuccessfulExtraction = (mockAdapter: any) => {
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionAttachmentsDone);
};

export const expectDelayExtraction = (mockAdapter: any, delay: number) => {
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionAttachmentsDelay, {
    delay,
  });
};

export const expectErrorExtraction = (mockAdapter: any, message: string) => {
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionAttachmentsError, {
    error: { message },
  });
};

export const expectProgressExtraction = (mockAdapter: any, progress: number = 50) => {
  expect(mockAdapter.emit).toHaveBeenCalledWith(ExtractorEventType.ExtractionAttachmentsProgress, {
    progress,
  });
};

export const expectConsoleError = (expectedMessage: string) => {
  return jest.spyOn(console, 'error');
};

export const expectConsoleWarn = () => {
  return jest.spyOn(console, 'warn');
};

// Mock configuration helpers
export const setupAxiosClientMock = (mockAxiosClient: any, response: any) => {
  mockAxiosClient.get.mockResolvedValue(response);
};

export const setupAxiosClientError = (mockAxiosClient: any, error: any) => {
  mockAxiosClient.get.mockRejectedValue(error);
};

export const setupAxiosErrorMocks = (mockAxios: any, mockSerializeAxiosError: any, isAxiosError: boolean = true) => {
  mockAxios.isAxiosError.mockReturnValue(isAxiosError);
  if (isAxiosError) {
    mockSerializeAxiosError.mockReturnValue(createSerializedAxiosError());
  }
};

// Stream function test helpers
export const createStreamTestScenario = (item: any, event: any, expectedUrl: string, expectedHeaders: any) => ({
  item,
  event,
  expectedUrl,
  expectedHeaders,
});

export const expectAxiosCall = (mockAxiosClient: any, url: string, config: any) => {
  expect(mockAxiosClient.get).toHaveBeenCalledWith(url, config);
};

export const createOAuthHeaders = (apiKey: string = 'test-api-key', token: string = 'test-token') => ({
  'Accept-Encoding': 'identity',
  'Authorization': `OAuth oauth_consumer_key="${apiKey}", oauth_token="${token}"`,
});

// Date calculation helpers
export const calculateDelayFromDate = (futureDate: Date) => {
  const now = new Date();
  return Math.max(0, Math.ceil((futureDate.getTime() - now.getTime()) / 1000));
};