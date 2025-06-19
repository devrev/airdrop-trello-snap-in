import { ExternalSyncUnit, ExtractorEventType, processTask } from '@devrev/ts-adaas';
import axios from 'axios';

/**
 * State interface for the boards sync units extraction
 */
interface BoardsSyncState {
  completed: boolean;
  error?: string;
}

/**
 * Extracts Trello API key and token from the connection data key string
 * 
 * @param keyString - The key string from connection_data (format: "key=<api_key>&token=<token>")
 * @returns Object containing the extracted API key and token
 */
function extractCredentials(keyString: string): { apiKey: string; token: string } {
  try {
    // Parse the key string which is in format "key=<api_key>&token=<token>"
    const keyMatch = keyString.match(/key=([^&]+)/);
    const tokenMatch = keyString.match(/token=([^&]+)/);
    
    if (!keyMatch || !tokenMatch) {
      throw new Error('Invalid key format. Expected format: "key=<api_key>&token=<token>"');
    }
    
    return {
      apiKey: keyMatch[1],
      token: tokenMatch[1]
    };
  } catch (error) {
    throw new Error(`Failed to extract credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fetches boards from Trello API
 * 
 * @param apiKey - The Trello API key
 * @param token - The Trello API token
 * @returns Array of board objects
 */
async function fetchBoards(apiKey: string, token: string): Promise<any[]> {
  try {
    // Make a request to the Trello API to fetch boards
    const response = await axios.get('https://api.trello.com/1/members/me/boards', {
      params: {
        key: apiKey,
        token: token,
        fields: 'name,desc,url,closed,idOrganization,shortUrl'
      },
      timeout: 10000 // 10 second timeout
    });
    
    return response.data;
  } catch (error) {
    const axiosError = error as any;
    
    if (axiosError.response) {
      throw new Error(`Failed to fetch boards with status ${axiosError.response.status}: ${axiosError.response.statusText}`);
    } else if (axiosError.request) {
      throw new Error(`Failed to fetch boards: ${axiosError.message || 'No response received from Trello API'}`);
    } else {
      throw new Error(`Failed to fetch boards: ${axiosError.message || 'Unknown error'}`);
    }
  }
}

/**
 * Fetches the cards count for a board from Trello API
 * 
 * @param boardId - The ID of the board
 * @param apiKey - The Trello API key
 * @param token - The Trello API token
 * @returns The number of cards in the board
 */
async function fetchCardCount(boardId: string, apiKey: string, token: string): Promise<number> {
  try {
    // Make a request to the Trello API to fetch cards for the specified board
    const response = await axios.get(`https://api.trello.com/1/boards/${boardId}/cards`, {
      params: {
        key: apiKey,
        token: token,
        fields: 'id' // Only request minimal data since we just need the count
      },
      timeout: 10000 // 10 second timeout
    });
    
    return response.data.length;
  } catch (error) {
    console.error(`Failed to fetch card count for board ${boardId}:`, error);
    return 0; // Return 0 if there's an error to avoid failing the entire process
  }
}

/**
 * Transforms Trello boards into external sync units
 * 
 * @param boards - Array of Trello board objects
 * @returns Array of ExternalSyncUnit objects
 */
function transformBoardsToSyncUnits(boards: any[]): ExternalSyncUnit[] {
  return boards.map(board => {
    return {
    id: board.id,
    name: board.name,
    description: board.desc || `Trello board: ${board.name}`,
    item_type: 'cards',
    item_count: board.cardCount || 0
  }});
}

/**
 * Worker file for handling boards as external sync units
 */
processTask<BoardsSyncState>({
  task: async ({ adapter }) => {
    try {
      console.log('Starting boards as external sync units extraction');
      
      // Get connection data from the event
      const connectionData = adapter.event.payload.connection_data;
      if (!connectionData || !connectionData.key) {
        throw new Error('Missing connection data or key');
      }
      
      // Extract API key and token
      const { apiKey, token } = extractCredentials(connectionData.key);
      
      // Fetch boards from Trello API
      const boards = await fetchBoards(apiKey, token);
      
      if (!boards || boards.length === 0) {
        console.log('No boards found');
        // Even with no boards, we should emit an empty array to indicate success
        await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
          external_sync_units: [],
        });
        adapter.state.completed = true;
        return;
      }
      
      console.log(`Fetched ${boards.length} boards from Trello API, now fetching card counts...`);
      
      // Fetch card counts for each board
      const boardsWithCardCounts = await Promise.all(
        boards.map(async (board) => {
          try {
            const cardCount = await fetchCardCount(board.id, apiKey, token);
            return {
              ...board,
              cardCount
            };
          } catch (error) {
            console.error(`Error fetching card count for board ${board.id}:`, error);
            return board; // Return the board without card count if there's an error
          }
        })
      );
      
      const externalSyncUnits = transformBoardsToSyncUnits(boardsWithCardCounts);
      
      // Emit the external sync units done event
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
        external_sync_units: externalSyncUnits,
      });
      
      // Update state to indicate completion
      adapter.state.completed = true;
      
      console.log('Successfully pushed boards as external sync units');
    } catch (error) {
      console.error('Error pushing boards as external sync units:', error);
      
      // Update state to indicate error
      adapter.state.completed = false;
      adapter.state.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Emit error event
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error pushing boards as external sync units',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('Pushing boards as external sync units timed out');
    
    // Update state to indicate timeout
    adapter.state.completed = false;
    adapter.state.error = 'Pushing boards as external sync units timed out';
    
    // Emit error event on timeout
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: 'Pushing boards as external sync units timed out',
      },
    });
  },
});