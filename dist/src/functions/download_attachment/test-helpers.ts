import { DownloadAttachmentResponse } from './index';
import { TrelloApiResponse } from '../../core/trello-client';

/**
 * Creates test scenarios for various download configurations
 */
export const createDownloadTestScenarios = () => {
  return {
    serverError: {
      description: 'should handle server errors correctly',
      mockResponse: {
        status_code: 500,
        api_delay: 0,
        message: 'Trello API server error',
      } as TrelloApiResponse,
    },
    successWithoutData: {
      description: 'should handle successful response without attachment data',
      mockResponse: {
        status_code: 200,
        api_delay: 0,
        message: 'Success but no data',
      } as TrelloApiResponse,
    },
  };
};

/**
 * Validates that a response matches the expected success pattern
 */
export const validateSuccessResponseStructure = (result: DownloadAttachmentResponse) => {
  expect(result.status).toBe('success');
  expect(result.status_code).toBe(200);
  expect(result.api_delay).toBe(0);
  expect(result.message).toBe('Successfully downloaded attachment');
  expect(result.timestamp).toBeDefined();
  expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  expect(result.file_data).toBeDefined();
  expect(result.file_name).toBeDefined();
  expect(result.content_type).toBeDefined();
};

/**
 * Validates that a response matches the expected failure pattern
 */
export const validateFailureResponseStructure = (
  result: DownloadAttachmentResponse,
  expectedStatusCode: number,
  expectedMessage: string,
  expectedApiDelay: number = 0
) => {
  expect(result.status).toBe('failure');
  expect(result.status_code).toBe(expectedStatusCode);
  expect(result.api_delay).toBe(expectedApiDelay);
  expect(result.message).toBe(expectedMessage);
  expect(result.timestamp).toBeDefined();
  expect(new Date(result.timestamp)).toBeInstanceOf(Date);
  expect(result.file_data).toBeUndefined();
  expect(result.file_name).toBeUndefined();
  expect(result.content_type).toBeUndefined();
};