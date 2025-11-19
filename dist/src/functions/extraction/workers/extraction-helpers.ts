import { ExtractorEventType } from '@devrev/ts-adaas';
import { TrelloApiResponse } from '../../../core/trello-client';

/**
 * Handle API response validation and error/rate limit handling
 * Returns true if the response is successful, false otherwise
 */
export async function handleApiResponse(
  adapter: any,
  response: TrelloApiResponse,
  errorContext: string
): Promise<boolean> {
  // Handle rate limiting
  if (response.status_code === 429) {
    await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
      delay: response.api_delay,
    });
    return false;
  }

  // Handle API errors
  if (response.status_code !== 200 || !response.data) {
    const error = new Error(response.message);
    console.error(`Error ${errorContext}:`, error.message);
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: { message: error.message },
    });
    return false;
  }

  return true;
}

/**
 * Check for rate limiting in async operations
 * Returns the delay if rate limited, 0 otherwise
 */
export function checkRateLimit(response: TrelloApiResponse): number {
  if (response.status_code === 429) {
    return response.api_delay;
  }
  return 0;
}

/**
 * Emit rate limit delay event
 */
export async function emitRateLimitDelay(adapter: any, delay: number): Promise<void> {
  await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
    delay: delay,
  });
}