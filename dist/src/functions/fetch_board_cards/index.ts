import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

export interface FetchBoardCardsResult {
  cards?: any[];
  status_code: number;
  api_delay: number;
  message: string;
}

/**
 * Function that fetches cards for a board from Trello API.
 * 
 * @param events Array of function input events
 * @returns Object containing board cards data and API response info
 */
export async function run(events: FunctionInput[]): Promise<FetchBoardCardsResult> {
  try {
    // Process only the first event
    if (!events || events.length === 0) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Fetch board cards failed: No events provided',
      };
    }

    const event = events[0];
    
    // Extract connection data
    const connectionData = event.payload.connection_data;
    if (!connectionData || !connectionData.key) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Fetch board cards failed: Missing connection data',
      };
    }

    // Extract board ID from external_sync_unit_id
    const boardId = event.payload.event_context?.external_sync_unit_id;
    if (!boardId) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Fetch board cards failed: Missing board ID',
      };
    }

    // Extract pagination parameters
    const globalValues = event.input_data.global_values;
    const limitStr = globalValues?.limit;
    if (!limitStr) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Fetch board cards failed: Missing required limit parameter',
      };
    }

    const limit = parseInt(limitStr, 10);
    if (isNaN(limit) || limit <= 0) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Fetch board cards failed: Invalid limit parameter',
      };
    }

    const before = globalValues?.before;

    // Parse API credentials
    let credentials;
    try {
      credentials = TrelloClient.parseCredentials(connectionData.key);
    } catch (error) {
      return {
        status_code: 0,
        api_delay: 0,
        message: `Fetch board cards failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Initialize Trello client and fetch board cards
    const trelloClient = new TrelloClient({
      apiKey: credentials.apiKey,
      token: credentials.token,
    });

    const response = await trelloClient.getBoardCards(boardId, limit, before);

    const result: FetchBoardCardsResult = {
      status_code: response.status_code,
      api_delay: response.api_delay,
      message: response.message,
    };

    // Include cards data if successful
    if (response.status_code === 200 && response.data) {
      result.cards = response.data;
    }

    return result;
  } catch (error) {
    console.error('Error in fetch_board_cards function:', error);
    return {
      status_code: 0,
      api_delay: 0,
      message: `Fetch board cards failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}