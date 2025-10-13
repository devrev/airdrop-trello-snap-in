import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

export interface FetchCreatedByResponse {
  status: 'success' | 'failure';
  status_code: number;
  api_delay: number;
  message: string;
  timestamp: string;
  creator_id?: string;
}

/**
 * Fetch created by function that retrieves the ID of the user that created a specific card.
 * Makes a request to /cards/{id}/actions endpoint with filter=createCard and fields=idMemberCreator.
 */
const run = async (events: FunctionInput[]): Promise<FetchCreatedByResponse> => {
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

    if (!event.input_data) {
      throw new Error('Invalid event: missing input_data');
    }

    if (!event.input_data.global_values) {
      throw new Error('Invalid event: missing global_values in input_data');
    }

    if (!event.input_data.global_values.idCard) {
      throw new Error('Invalid event: missing idCard in global_values');
    }

    // Extract card ID
    const cardId = event.input_data.global_values.idCard;

    // Create Trello client from connection data
    const trelloClient = TrelloClient.fromConnectionData(event.payload.connection_data.key);

    // Fetch card actions from Trello API
    const response = await trelloClient.getCardActions(cardId, 'createCard', 'idMemberCreator');

    const timestamp = new Date().toISOString();

    if (response.status_code === 200 && response.data) {
      // Check if we have actions and the first action has a creator ID
      if (response.data.length > 0 && response.data[0].idMemberCreator) {
        return {
          status: 'success',
          status_code: response.status_code,
          api_delay: response.api_delay,
          message: 'Successfully retrieved card creator ID',
          timestamp,
          creator_id: response.data[0].idMemberCreator,
        };
      } else {
        // No actions found or no creator ID in the first action
        return {
          status: 'failure',
          status_code: response.status_code,
          api_delay: response.api_delay,
          message: 'No card creation action found or creator ID missing',
          timestamp,
        };
      }
    } else {
      // Failed to fetch card actions
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
    console.error('Fetch created by function error:', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      timestamp,
    });

    // Return failure response for any errors
    return {
      status: 'failure',
      status_code: 500,
      api_delay: 0,
      message: error instanceof Error ? error.message : 'Unknown error occurred during card creator fetching',
      timestamp,
    };
  }
};

export default run;