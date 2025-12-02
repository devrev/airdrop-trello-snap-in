import axios, { AxiosError } from 'axios';
import { TrelloApiResponse } from './trello-client';

/**
 * Handle Trello API errors with consistent error handling and rate limiting
 */
export function handleTrelloError(error: unknown, context: string): TrelloApiResponse {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Handle rate limiting
    if (axiosError.response?.status === 429) {
      // Extract Retry-After header (case-insensitive)
      let retryAfter: string | undefined;
      const headers = axiosError.response.headers;
      if (headers) {
        retryAfter = headers['retry-after'] || headers['Retry-After'];
      }
      
      // Parse delay and ensure it's a valid number
      let delay = 3; // Default delay
      if (retryAfter) {
        const parsed = parseInt(retryAfter, 10);
        delay = !isNaN(parsed) && parsed > 0 ? parsed : 3;
      }
      
      return {
        status_code: 429,
        api_delay: delay,
        message: 'Rate limit exceeded',
      };
    }

    // Handle other HTTP errors
    return {
      status_code: axiosError.response?.status || 500,
      api_delay: 0,
      message: `API error: ${axiosError.message}`,
    };
  }

  // Handle non-Axios errors
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Error ${context}:`, errorMessage);
  throw error;
}