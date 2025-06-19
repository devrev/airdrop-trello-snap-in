import { ExtractorEventType, NormalizedItem, processTask } from '@devrev/ts-adaas';
import axios from 'axios';

/**
 * State interface for the cards extraction process
 */
interface CardsExtractionState {
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
 * Fetches cards from Trello API for a specific board
 * 
 * @param boardId - The ID of the board
 * @param apiKey - The Trello API key
 * @param token - The Trello API token
 * @returns Array of card objects
 */
async function fetchCards(boardId: string, apiKey: string, token: string): Promise<any[]> {
  try {
    // Make a request to the Trello API to fetch cards for the specified board
    const response = await axios.get(`https://api.trello.com/1/boards/${boardId}/cards`, {
      params: {
        key: apiKey,
        token: token,
        fields: 'name,desc,closed,idList,idBoard,url,shortUrl,due,dueComplete,labels,idMembers',
        members: 'true',
        member_fields: 'id'
      },
      timeout: 10000 // 10 second timeout
    });
    
    return response.data;
  } catch (error) {
    const axiosError = error as any;
    
    if (axiosError.response) {
      throw new Error(`Failed to fetch cards with status ${axiosError.response.status}: ${axiosError.response.statusText}`);
    } else if (axiosError.request) {
      throw new Error(`Failed to fetch cards: ${axiosError.message || 'No response received from Trello API'}`);
    } else {
      throw new Error(`Failed to fetch cards: ${axiosError.message || 'Unknown error'}`);
    }
  }
}

/**
 * Normalizes a Trello card object to the format expected by the Airdrop platform
 * 
 * @param card - The Trello card object
 * @returns A normalized card object
 */
function normalizeCard(card: any): NormalizedItem {
  // Use current timestamp for created_date and modified_date if not available
  const timestamp = new Date().toISOString();
  
  return {
    id: card.id,
    created_date: timestamp,
    modified_date: timestamp,
    data: {
      id: card.id,
      name: card.name,
      description: card.desc,
      is_closed: card.closed,
      list_id: card.idList,
      board_id: card.idBoard,
      url: card.url,
      short_url: card.shortUrl,
      due_date: card.due,
      is_due_complete: card.dueComplete,
      labels: card.labels ? card.labels.map((label: any) => ({
        id: label.id,
        name: label.name,
        color: label.color
      })) : [],
      member_ids: card.idMembers || [],
      // Add item_url_field for domain mapping
      item_url_field: card.url,
      // Add assignee for domain mapping (using the first member if available)
      assignee: card.idMembers && card.idMembers.length > 0 ? card.idMembers[0] : null
    }
  };
}

/**
 * Worker file for handling cards extraction
 */
processTask<CardsExtractionState>({
  task: async ({ adapter }) => {
    try {
      console.log('Starting cards extraction');
      
      // Get connection data from the event
      const connectionData = adapter.event.payload.connection_data;
      if (!connectionData || !connectionData.key) {
        throw new Error('Missing connection data or key');
      }
      
      // Get board ID from the event context
      const boardId = adapter.event.payload.event_context.external_sync_unit_id;
      if (!boardId) {
        throw new Error('Missing board ID in event context');
      }
      
      // Extract API key and token
      const { apiKey, token } = extractCredentials(connectionData.key);
      
      // Fetch cards from Trello API
      const cards = await fetchCards(boardId, apiKey, token);
      
      if (!cards || cards.length === 0) {
        console.log(`No cards found for board ${boardId}`);
        // Even with no cards, we should emit a progress event to indicate success
        await adapter.emit(ExtractorEventType.ExtractionDataProgress, {
          progress: 100
        });
        
        // Emit the data extraction done event
        await adapter.emit(ExtractorEventType.ExtractionDataDone);
        
        adapter.state.completed = true;
        return;
      }
      
      console.log(`Fetched ${cards.length} cards from board ${boardId}`);
      
      // Initialize repository for cards
      const repos = [
        {
          itemType: 'cards',
          normalize: normalizeCard
        }
      ];
      
      adapter.initializeRepos(repos);
      
      // Push cards to the repository
      await adapter.getRepo('cards')?.push(cards);
      
      // Emit progress event
      await adapter.emit(ExtractorEventType.ExtractionDataProgress, {
        progress: 100
      });
      
      // Update state to indicate completion
      adapter.state.completed = true;
      
      // Emit the data extraction done event
      await adapter.emit(ExtractorEventType.ExtractionDataDone);
      
      console.log('Cards extraction completed successfully');
    } catch (error) {
      console.error('Error in cards extraction:', error);
      
      // Update state to indicate error
      adapter.state.completed = false;
      adapter.state.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Emit error event
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during cards extraction',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('Cards extraction timed out');
    
    // Update state to indicate timeout
    adapter.state.completed = false;
    adapter.state.error = 'Cards extraction timed out';
    
    // Emit error event on timeout
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: {
        message: 'Cards extraction timed out',
      },
    });
  },
});