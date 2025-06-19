import {
  ExtractorEventType,
  NormalizedItem,
  processTask,
} from '@devrev/ts-adaas';
import axios from 'axios';

/**
 * State interface for the data extraction process
 */
interface DataExtractionState {
  users: {
    completed: boolean;
    error?: string;
  };
  cards: {
    completed: boolean;
    error?: string;
  };
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
 * Fetches users from Trello API
 * 
 * @param orgId - The organization ID
 * @param apiKey - The Trello API key
 * @param token - The Trello API token
 * @returns Array of user objects
 */
async function fetchUsers(orgId: string, apiKey: string, token: string): Promise<any[]> {
  try {
    // Make a request to the Trello API to fetch organization members
    const response = await axios.get(`https://api.trello.com/1/organizations/${orgId}/members`, {
      params: {
        key: apiKey,
        token: token,
        fields: 'username,fullName,initials,email,avatarUrl,bio,url'
      },
      timeout: 10000 // 10 second timeout
    });
    
    return response.data;
  } catch (error) {
    const axiosError = error as Error & { response?: any; request?: any; message?: string };
    
    if (axiosError.response) {
      throw new Error(`Failed to fetch users with status ${axiosError.response.status}: ${axiosError.response.statusText}`);
    } else if (axiosError.request) {
      throw new Error(`Failed to fetch users: ${axiosError.message || 'No response received from Trello API'}`);
    } else {
      throw new Error(`Failed to fetch users: ${axiosError.message || 'Unknown error'}`);
    }
  }
}

/**
 * Normalizes a Trello user object to the format expected by the Airdrop platform
 * 
 * @param user - The Trello user object
 * @returns A normalized user object
 */
function normalizeUser(user: any): NormalizedItem {
  // Use current timestamp for created_date and modified_date if not available
  const timestamp = new Date().toISOString();
  
  return {
    id: user.id,
    created_date: timestamp,
    modified_date: timestamp,
    data: {
      id: user.id,
      username: user.username,
      full_name: user.fullName,
      initials: user.initials,
      email: user.email,
      avatar_url: user.avatarUrl,
      bio: user.bio,
      url: user.url
    }
  };
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
    const axiosError = error as Error & { response?: any; request?: any; message?: string };
    
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
 * Worker file for handling combined data extraction (users and cards)
 */
processTask<DataExtractionState>({
  task: async ({ adapter }) => {
    try {
      console.log('Starting combined data extraction (users and cards)');
      let hasError = false;
      
      // Initialize state
      if (!adapter.state) {
        adapter.state = {
          users: { completed: false },
          cards: { completed: false }
        };
      }
      
      // Ensure state properties are initialized
      if (!adapter.state.users) {
        adapter.state.users = { completed: false };
      }
      if (!adapter.state.cards) {
        adapter.state.cards = { completed: false };
      }
      
      // Get connection data from the event
      const connectionData = adapter.event.payload.connection_data;
      if (!connectionData || !connectionData.key) {
        throw new Error('Missing connection data or key');
      }
      
      // Extract API key and token
      const { apiKey, token } = extractCredentials(connectionData.key);
      
      // Initialize repositories for users and cards
      const repos = [
        {
          itemType: 'users',
          normalize: normalizeUser
        },
        {
          itemType: 'cards',
          normalize: normalizeCard
        }
      ];
      
      adapter.initializeRepos(repos);
      
      // Step 1: Extract users
      try {
        console.log('Extracting users...');
        
        // Get organization ID from the event
        const orgId = connectionData.org_id;
        if (!orgId) {
          throw new Error('Missing organization ID in connection data');
        }
        
        // Fetch users from Trello API
        const users = await fetchUsers(orgId, apiKey, token);
        console.log(`Fetched ${users ? users.length : 0} users from Trello organization`);
        
        if (users && users.length > 0) {
          console.log(`Fetched ${users.length} users from Trello organization`);
          
          // Push users to the repository
          await adapter.getRepo('users')?.push(users);
        } else {
          console.log('No users found');
        }
        
        // Mark users extraction as completed
        adapter.state.users.completed = true;
      } catch (error) {
        console.error('Error in users extraction:', error);
        
        // Update state to indicate error
        adapter.state.users.completed = false;
        adapter.state.users.error = error instanceof Error ? error.message : 'Unknown error';
        
        hasError = true;
        
        // Emit progress event to indicate partial completion
        await adapter.emit(ExtractorEventType.ExtractionDataProgress, {
          progress: 50
        });
      }
      
      // Step 2: Extract cards
      try {
        console.log('Extracting cards...');
        
        // Get board ID from the event context
        const boardId = adapter.event.payload.event_context.external_sync_unit_id;
        if (!boardId) {
          throw new Error('Missing board ID in event context');
        }
        
        // Fetch cards from Trello API
        const cards = await fetchCards(boardId, apiKey, token);
        console.log(`Fetched ${cards ? cards.length : 0} cards from board ${boardId}`);
        
        if (cards && cards.length > 0) {
          console.log(`Fetched ${cards.length} cards from board ${boardId}`);
          
          // Push cards to the repository
          await adapter.getRepo('cards')?.push(cards);
        } else {
          console.log(`No cards found for board ${boardId}`);
        }
        
        // Mark cards extraction as completed
        adapter.state.cards.completed = true;
      } catch (error) {
        console.error('Error in cards extraction:', error);
        
        // Update state to indicate error
        adapter.state.cards.completed = false;
        adapter.state.cards.error = error instanceof Error ? error.message : 'Unknown error';
        
        hasError = true;
        
        // Emit progress event to indicate partial completion
        await adapter.emit(ExtractorEventType.ExtractionDataProgress, {
          progress: 75
        });
        // Don't rethrow - we'll handle the error at the end
      }
      
      // Save state before emitting final events
      await adapter.postState();
      
      if (hasError && !adapter.state.users.completed && !adapter.state.cards.completed) {
        // If there were any errors, emit an error event
        await adapter.emit(ExtractorEventType.ExtractionDataError, {
          error: { message: 'One or more extraction processes failed. Check logs for details.' }
        });
      } else {
        // Emit progress event to indicate completion
        await adapter.emit(ExtractorEventType.ExtractionDataProgress, { progress: 100 });
        
        // Emit the data extraction done event - only once after both operations are complete
        await adapter.emit(ExtractorEventType.ExtractionDataDone);
      }
      
      // Log completion
      const status = hasError ? "with some errors" : "successfully";
      console.log('Combined data extraction completed successfully');
    } catch (error) {
      console.error('Error in combined data extraction:', error);

      await adapter.postState();
      // Emit error event
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during data extraction',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('Combined data extraction timed out');
    
    // Post the current state to preserve progress
    await adapter.postState(); 
    
    // Emit progress event on timeout
    await adapter.emit(ExtractorEventType.ExtractionDataProgress, {
      progress: 50,
    });
  },
});