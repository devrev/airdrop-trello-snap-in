import axios, { AxiosResponse } from 'axios';

/**
 * Interface for API response from Trello
 */
export interface TrelloApiResponse<T = any> {
  data?: T;
  status_code: number;
  api_delay: number;
  message: string;
  raw_response: any;
}

/**
 * Interface for Trello client configuration
 */
export interface TrelloClientConfig {
  baseUrl: string;
  apiKey: string;
  token: string;
}

/**
 * Parse API credentials from connection data key
 * @param connectionKey The key field from connection_data (format: "key=<api_key>&token=<token>")
 * @returns Object with apiKey and token
 */
export function parseApiCredentials(connectionKey: string): { apiKey: string; token: string } {
  const params = new URLSearchParams(connectionKey);
  const apiKey = params.get('key');
  const token = params.get('token');

  if (!apiKey || !token) {
    throw new Error('Invalid connection key format. Expected format: key=<api_key>&token=<token>');
  }

  return { apiKey, token };
}

/**
 * Sanitize response object to remove circular references
 * @param response The axios response object
 * @returns Sanitized response object
 */
export function sanitizeResponse(response: AxiosResponse): any {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    data: response.data,
  };
}

/**
 * Handle API errors and rate limiting
 * @param error The axios error object
 * @param defaultMessage Default error message
 * @returns Formatted error response
 */
export function handleApiError(error: any, defaultMessage: string): TrelloApiResponse {
  if (error.response) {
    const status = error.response.status;
    let apiDelay = 0;
    let message = defaultMessage;

    // Handle rate limiting (429 status)
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        // Parse Retry-After header (can be HTTP date or seconds)
        if (isNaN(Number(retryAfter))) {
          // HTTP date format
          const retryDate = new Date(retryAfter);
          const now = new Date();
          apiDelay = Math.max(0, Math.ceil((retryDate.getTime() - now.getTime()) / 1000));
        } else {
          // Seconds format
          apiDelay = parseInt(retryAfter, 10);
        }
      } else {
        // Default delay if no Retry-After header
        apiDelay = 5;
      }
      message = `Rate limit exceeded. Retry after ${apiDelay} seconds`;
    } else if (status === 401) {
      message = 'Authentication failed. Invalid API key or token';
    } else if (status === 403) {
      message = 'Access forbidden. Check permissions';
    } else if (status === 404) {
      message = 'Member not found';
    } else {
      message = `API request failed with status ${status}`;
    }

    return {
      status_code: status,
      api_delay: apiDelay,
      message: message,
      raw_response: error.response ? sanitizeResponse(error.response) : null,
    };
  } else if (error.request) {
    return {
      status_code: 0,
      api_delay: 0,
      message: 'Network error: No response received from API',
      raw_response: error.request,
    };
  } else {
    return {
      status_code: 0,
      api_delay: 0,
      message: `Request setup error: ${error.message}`,
      raw_response: { message: error.message, name: error.name },
    };
  }
}