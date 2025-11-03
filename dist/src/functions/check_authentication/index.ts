import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

export interface AuthenticationCheckResponse {
  status: 'success' | 'failure';
  status_code: number;
  api_delay: number;
  message: string;
  timestamp: string;
  member_info?: {
    id: string;
    username?: string;
    full_name?: string;
  };
}

/**
 * Authentication check function that verifies if authentication with Trello API works.
 * Makes a request to /members/me endpoint to test authentication.
 */
const run = async (events: FunctionInput[]): Promise<AuthenticationCheckResponse> => {
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

    // Test authentication by getting current member info
    const response = await trelloClient.getCurrentMember();

    const timestamp = new Date().toISOString();

    if (response.status_code === 200 && response.data) {
      // Authentication successful
      return {
        status: 'success',
        status_code: response.status_code,
        api_delay: response.api_delay,
        message: 'Authentication successful - API key and token are valid',
        timestamp,
        member_info: {
          id: response.data.id,
          username: response.data.username,
          full_name: response.data.fullName,
        },
      };
    } else {
      // Authentication failed
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
    console.error('Authentication check function error:', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      timestamp,
    });

    // Return failure response for any errors
    return {
      status: 'failure',
      status_code: 500,
      api_delay: 0,
      message: error instanceof Error ? error.message : 'Unknown error occurred during authentication check',
      timestamp,
    };
  }
};

export default run;