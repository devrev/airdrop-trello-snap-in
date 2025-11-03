import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

export interface FetchBoardCardsResponse {
  status: 'success' | 'failure';
  status_code: number;
  api_delay: number;
  message: string;
  timestamp: string;
  cards?: Array<{
    id: string;
    name: string;
    desc?: string;
    closed: boolean;
    date_last_activity?: string;
    [key: string]: any;
  }>;
}

/**
 * Fetch board cards function that retrieves the list of cards for a specific board.
 * Makes a request to /boards/{id}/cards endpoint with pagination support.
 */
const run = async (events: FunctionInput[]): Promise<FetchBoardCardsResponse> => {
  try {
    // Validate input
    if (!events || !Array.isArray(events)) {
      throw new Error('Invalid input: events must be an array');
    }

    if (events.length === 0) {
      throw new Error('Invalid input: events array cannot be empty');
    }

    // Process only the first event as per requirements
    const event = events[0];

    // Validate event structure
    if (!event) {
      throw new Error('Invalid event: event cannot be null or undefined');
    }

    if (!event.payload) {
      throw new Error('Invalid event: missing payload');
    }

    if (!event.payload.connection_data) {
      throw new Error('Invalid event: missing connection_data in payload');
    }

    if (!event.payload.connection_data.key) {
      throw new Error('Invalid event: missing key in connection_data');
    }

    if (!event.payload.event_context) {
      throw new Error('Invalid event: missing event_context in payload');
    }

    if (!event.payload.event_context.external_sync_unit_id) {
      throw new Error('Invalid event: missing external_sync_unit_id in event_context');
    }

    if (!event.input_data) {
      throw new Error('Invalid event: missing input_data');
    }

    if (!event.input_data.global_values) {
      throw new Error('Invalid event: missing global_values in input_data');
    }

    if (!event.input_data.global_values.limit) {
      throw new Error('Invalid event: missing limit in global_values');
    }

    // Extract parameters
    const boardId = event.payload.event_context.external_sync_unit_id;
    const limit = parseInt(event.input_data.global_values.limit, 10);
    const before = event.input_data.global_values.before;

    // Validate limit parameter
    if (isNaN(limit) || limit <= 0) {
      throw new Error('Invalid event: limit must be a positive integer');
    }

    // Create Trello client from connection data
    const trelloClient = TrelloClient.fromConnectionData(event.payload.connection_data.key);

    // Fetch board cards from Trello API
    const response = await trelloClient.getBoardCards(boardId, limit, before);

    const timestamp = new Date().toISOString();

    if (response.status_code === 200 && response.data) {
      // Successfully fetched board cards
      return {
        status: 'success',
        status_code: response.status_code,
        api_delay: response.api_delay,
        message: 'Successfully retrieved board cards',
        timestamp,
        cards: response.data.map(card => {
          const { dateLastActivity, ...cardWithoutCamelCase } = card;
          return {
            ...cardWithoutCamelCase,
            date_last_activity: dateLastActivity,
          };
        }),
      };
    } else {
      // Failed to fetch board cards
      return {
        status: 'failure',
        status_code: response.status_code,
        api_delay: response.api_delay,
        message: response.message,
        timestamp,
      };
    }
  } catch (error) {
    const timestamp = new Date().toISOString();
    
    // Log error for debugging purposes
    console.error('Fetch board cards function error:', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      timestamp,
    });

    // Return failure response for any errors
    return {
      status: 'failure',
      status_code: 500,
      api_delay: 0,
      message: error instanceof Error ? error.message : 'Unknown error occurred during board cards fetching',
      timestamp,
    };
  }
};

export default run;