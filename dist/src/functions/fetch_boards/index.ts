import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

export interface FetchBoardsResponse {
  status: 'success' | 'failure';
  status_code: number;
  api_delay: number;
  message: string;
  timestamp: string;
  boards?: Array<{
    id: string;
    name: string;
    desc?: string;
    closed: boolean;
    url?: string;
    short_url?: string;
    date_last_activity?: string;
    [key: string]: any;
  }>;
}

/**
 * Fetch boards function that retrieves the list of boards for the authenticated user.
 * Makes a request to /members/me/boards endpoint.
 */
const run = async (events: FunctionInput[]): Promise<FetchBoardsResponse> => {
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

    // Create Trello client from connection data
    const trelloClient = TrelloClient.fromConnectionData(event.payload.connection_data.key);

    // Fetch boards from Trello API
    const response = await trelloClient.getMemberBoards();

    const timestamp = new Date().toISOString();

    if (response.status_code === 200 && response.data) {
      // Successfully fetched boards
      return {
        status: 'success',
        status_code: response.status_code,
        api_delay: response.api_delay,
        message: response.message,
        timestamp,
        boards: response.data.map(board => {
          const { shortUrl, dateLastActivity, ...boardWithoutCamelCase } = board;
          return {
            ...boardWithoutCamelCase,
            short_url: shortUrl,
            date_last_activity: dateLastActivity,
          };
        }),
      };
    } else {
      // Failed to fetch boards
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
    console.error('Fetch boards function error:', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      timestamp,
    });

    // Return failure response for any errors
    return {
      status: 'failure',
      status_code: 500,
      api_delay: 0,
      message: error instanceof Error ? error.message : 'Unknown error occurred during board fetching',
      timestamp,
    };
  }
};

export default run;