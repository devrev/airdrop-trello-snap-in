import { TrelloApiResponse } from './trello-client';

/**
 * Centralized error handler for Trello API responses
 * @param error The axios error object
 * @returns Standardized TrelloApiResponse with error details
 */
export function handleTrelloApiError(error: any): TrelloApiResponse {
  if (error.response) {
    const statusCode = error.response.status;
    let apiDelay = 0;
    let message = `Trello API request failed with status ${statusCode}`;

    // Handle rate limiting
    if (statusCode === 429) {
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        // Parse HTTP date string to calculate delay
        const retryDate = new Date(retryAfter);
        const now = new Date();
        apiDelay = Math.max(0, Math.ceil((retryDate.getTime() - now.getTime()) / 1000));
      } else {
        apiDelay = 5; // Default delay if no Retry-After header
      }
      message = `Rate limit exceeded. Retry after ${apiDelay} seconds`;
    } else if (statusCode === 401) {
      message = 'Authentication failed. Invalid API key or token';
    } else if (statusCode === 403) {
      message = 'Access forbidden. Check API permissions';
    } else if (statusCode === 404) {
      message = 'Resource not found';
    }

    return {
      status_code: statusCode,
      api_delay: apiDelay,
      message: message,
    };
  } else if (error.request) {
    return {
      status_code: 0,
      api_delay: 0,
      message: 'Network error: Unable to reach Trello API',
    };
  } else {
    return {
      status_code: 0,
      api_delay: 0,
      message: `Request setup error: ${error.message}`,
    };
  }
}