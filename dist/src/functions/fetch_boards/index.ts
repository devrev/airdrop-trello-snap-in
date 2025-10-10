import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

export interface FetchBoardsResult {
  boards?: any[];
  status_code: number;
  api_delay: number;
  message: string;
}

/**
 * Function that fetches boards from Trello API.
 * 
 * @param events Array of function input events
 * @returns Object containing boards data and API response info
 */
export async function run(events: FunctionInput[]): Promise<FetchBoardsResult> {
  try {
    // Process only the first event
    if (!events || events.length === 0) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Fetch boards failed: No events provided',
      };
    }

    const event = events[0];
    
    // Extract connection data
    const connectionData = event.payload.connection_data;
    if (!connectionData || !connectionData.key) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Fetch boards failed: Missing connection data',
      };
    }

    // Parse API credentials
    let credentials;
    try {
      credentials = TrelloClient.parseCredentials(connectionData.key);
    } catch (error) {
      return {
        status_code: 0,
        api_delay: 0,
        message: `Fetch boards failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Initialize Trello client and fetch boards
    const trelloClient = new TrelloClient({
      apiKey: credentials.apiKey,
      token: credentials.token,
    });

    const response = await trelloClient.getBoardsForMember('me');

    const result: FetchBoardsResult = {
      status_code: response.status_code,
      api_delay: response.api_delay,
      message: response.message,
    };

    // Include boards data if successful
    if (response.status_code === 200 && response.data) {
      result.boards = response.data;
    }

    return result;
  } catch (error) {
    console.error('Error in fetch_boards function:', error);
    return {
      status_code: 0,
      api_delay: 0,
      message: `Fetch boards failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}