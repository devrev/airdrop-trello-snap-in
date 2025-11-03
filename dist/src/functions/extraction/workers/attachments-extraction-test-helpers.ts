import {
  axiosClient,
  axios,
  serializeAxiosError,
} from '@devrev/ts-adaas';
import {
  createTestItem,
  createTestEvent,
  createSuccessfulStreamResponse,
  createRateLimitResponse,
  createAxiosError,
  createSerializedAxiosError,
  setupAxiosClientMock,
  setupAxiosClientError,
  setupAxiosErrorMocks,
  createOAuthHeaders,
  expectDelayExtraction,
  expectErrorExtraction,
  expectConsoleWarn,
} from './attachments-extraction-test-setup';

/**
 * Integration test helpers for attachment streaming functionality
 */

export const runSuccessfulStreamingTest = async (mockTask: any, mockAdapter: any, mockAxiosClient: any) => {
  const mockStreamResponse = createSuccessfulStreamResponse();
  setupAxiosClientMock(mockAxiosClient, mockStreamResponse);

  // Mock the streamAttachments to call our stream function
  mockAdapter.streamAttachments.mockImplementation(async ({ stream }: { stream: any }) => {
    const result = await stream({
      item: createTestItem(),
      event: createTestEvent(),
    });
    return result;
  });

  await mockTask({ adapter: mockAdapter });

  expect(mockAxiosClient.get).toHaveBeenCalledWith(
    'https://api.trello.com/1/cards/card-123/attachments/att-123/download/file.pdf',
    {
      responseType: 'stream',
      headers: createOAuthHeaders(),
    }
  );
};

export const runRateLimitingWithRetryAfterTest = async (mockTask: any, mockAdapter: any, mockAxiosClient: any) => {
  const mockStreamResponse = createRateLimitResponse('120');
  setupAxiosClientMock(mockAxiosClient, mockStreamResponse);

  mockAdapter.streamAttachments.mockImplementation(async ({ stream }: { stream: any }) => {
    const result = await stream({
      item: createTestItem('att-123', 'https://example.com/file.pdf'),
      event: createTestEvent(),
    });
    return result;
  });

  await mockTask({ adapter: mockAdapter });

  expectDelayExtraction(mockAdapter, 120);
};

export const runRateLimitingWithHttpDateTest = async (mockTask: any, mockAdapter: any, mockAxiosClient: any) => {
  const futureDate = new Date(Date.now() + 90000); // 90 seconds from now
  const mockStreamResponse = createRateLimitResponse(futureDate.toUTCString());
  setupAxiosClientMock(mockAxiosClient, mockStreamResponse);

  mockAdapter.streamAttachments.mockImplementation(async ({ stream }: { stream: any }) => {
    const result = await stream({
      item: createTestItem('att-123', 'https://example.com/file.pdf'),
      event: createTestEvent(),
    });
    return result;
  });

  await mockTask({ adapter: mockAdapter });

  expectDelayExtraction(mockAdapter, expect.any(Number));
};

export const runMissingConnectionDataTest = async (mockTask: any, mockAdapter: any) => {
  mockAdapter.streamAttachments.mockImplementation(async ({ stream }: { stream: any }) => {
    const result = await stream({
      item: createTestItem('att-123', 'https://example.com/file.pdf'),
      event: createTestEvent(null),
    });
    return result;
  });

  await mockTask({ adapter: mockAdapter });

  expectErrorExtraction(mockAdapter, 'Missing connection data or API key for attachment att-123');
};

export const runAxiosErrorsTest = async (mockTask: any, mockAdapter: any, mockAxiosClient: any, mockAxios: any, mockSerializeAxiosError: any) => {
  const axiosError = createAxiosError();
  setupAxiosClientError(mockAxiosClient, axiosError);
  setupAxiosErrorMocks(mockAxios, mockSerializeAxiosError);

  mockAdapter.streamAttachments.mockImplementation(async ({ stream }: { stream: any }) => {
    const result = await stream({
      item: createTestItem('att-123', 'https://example.com/file.pdf'),
      event: createTestEvent(),
    });
    return result;
  });

  await mockTask({ adapter: mockAdapter });

  expectErrorExtraction(mockAdapter, 'Error while fetching attachment att-123 from URL.');
};

export const runNonAxiosErrorsTest = async (mockTask: any, mockAdapter: any, mockAxiosClient: any, mockAxios: any, mockSerializeAxiosError: any) => {
  const genericError = new Error('Generic error');
  setupAxiosClientError(mockAxiosClient, genericError);
  setupAxiosErrorMocks(mockAxios, mockSerializeAxiosError, false);

  mockAdapter.streamAttachments.mockImplementation(async ({ stream }: { stream: any }) => {
    const result = await stream({
      item: createTestItem('att-123', 'https://example.com/file.pdf'),
      event: createTestEvent(),
    });
    return result;
  });

  await mockTask({ adapter: mockAdapter });

  expectErrorExtraction(mockAdapter, 'Error while fetching attachment att-123 from URL.');
};

export const runWarningLogsTest = async (mockTask: any, mockAdapter: any, mockAxiosClient: any, mockAxios: any, mockSerializeAxiosError: any) => {
  const consoleSpy = expectConsoleWarn();
  const axiosError = createAxiosError();
  setupAxiosClientError(mockAxiosClient, axiosError);
  setupAxiosErrorMocks(mockAxios, mockSerializeAxiosError);

  const testItem = createTestItem('att-123', 'https://example.com/file.pdf');

  mockAdapter.streamAttachments.mockImplementation(async ({ stream }: { stream: any }) => {
    await stream({
      item: testItem,
      event: createTestEvent(),
    });
    return createErrorResponse('Error while fetching attachment att-123 from URL.');
  });

  await mockTask({ adapter: mockAdapter });

  expect(consoleSpy).toHaveBeenCalledWith('Error while fetching attachment att-123 from URL.', createSerializedAxiosError());
  expect(consoleSpy).toHaveBeenCalledWith('Failed attachment metadata', testItem);
};

// Helper to create error response for tests
const createErrorResponse = (message: string) => ({
  error: { message },
});