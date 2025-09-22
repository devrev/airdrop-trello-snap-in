import { TrelloClient, parseApiCredentials, TrelloApiResponse } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';

export interface FetchBoardCardsResult {
  success: boolean;
  status_code: number;
  api_delay: number;
  message: string;
  raw_response: any;
  cards?: any[];
}

/**
 * Function that fetches cards from a Trello board.
 * 
 * @param events Array of function input events
 * @returns Object containing the fetched cards and API response metadata
 */
export async function run(events: FunctionInput[]): Promise<FetchBoardCardsResult> {
  try {
    // Process only the first event
    if (!events || events.length === 0) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Fetch board cards failed: No events provided',
        raw_response: null,
      };
    }

    const event = events[0];
    
    // Validate required environment variable
    const baseUrl = process.env.TRELLO_BASE_URL;
    if (!baseUrl) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Fetch board cards failed: TRELLO_BASE_URL environment variable not set',
        raw_response: null,
      };
    }

    // Extract connection data
    const connectionData = event.payload.connection_data;
    if (!connectionData || !connectionData.key) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Fetch board cards failed: Missing connection data or API key',
        raw_response: null,
      };
    }

    // Get board ID from external_sync_unit_id
    const boardId = event.payload.event_context?.external_sync_unit_id;
    if (!boardId) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Fetch board cards failed: Missing board ID (external_sync_unit_id)',
        raw_response: null,
      };
    }

    // Get pagination parameters from global_values
    const limit = event.input_data?.global_values?.limit;
    const before = event.input_data?.global_values?.before;

    // Validate limit parameter
    if (!limit || isNaN(parseInt(limit, 10))) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Fetch board cards failed: Missing or invalid limit parameter',
        raw_response: null,
      };
    }

    // Parse API credentials
    let apiCredentials;
    try {
      apiCredentials = parseApiCredentials(connectionData.key);
    } catch (error) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: `Fetch board cards failed: ${error instanceof Error ? error.message : String(error)}`,
        raw_response: null,
      };
    }

    // Initialize Trello client
    const trelloClient = new TrelloClient({
      baseUrl: baseUrl,
      apiKey: apiCredentials.apiKey,
      token: apiCredentials.token,
    });

    // Fetch cards for the board
    const response: TrelloApiResponse = await trelloClient.getBoardCards(boardId, {
      limit: parseInt(limit, 10),
      before: before === undefined || before === null ? undefined : before,
    });

    // Determine success based on response
    const success = response.status_code === 200 && !!response.data;

    return {
      success: success,
      status_code: response.status_code,
      api_delay: response.api_delay,
      message: success 
        ? `Successfully fetched ${Array.isArray(response.data) ? response.data.length : 0} cards from board`
        : response.message,
      raw_response: response.raw_response,
      cards: success ? response.data : undefined,
    };

  } catch (error) {
    console.error('Error in fetch_board_cards function:', error);
    return {
      success: false,
      status_code: 0,
      api_delay: 0,
      message: `Fetch board cards failed: ${error instanceof Error ? error.message : String(error)}`,
      raw_response: null,
    };
  }
}