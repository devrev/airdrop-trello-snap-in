import { ExtractorEventType, NormalizedItem, processTask } from '@devrev/ts-adaas';
import axios from 'axios';

/**
 * State interface for the users extraction process
 */
interface UsersExtractionState {
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
    const axiosError = error as any;
    
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
 * Worker file for handling users extraction
 */
processTask<UsersExtractionState>({
  task: async ({ adapter }) => {
    try {
      console.log('Starting users extraction');
      
      // Get connection data from the event
      const connectionData = adapter.event.payload.connection_data;
      if (!connectionData || !connectionData.key || !connectionData.org_id) {
        throw new Error('Missing connection data, key, or organization ID');
      }
      
      // Extract API key and token
      const { apiKey, token } = extractCredentials(connectionData.key);
      
      // Fetch users from Trello API
      const users = await fetchUsers(connectionData.org_id, apiKey, token);
      
      if (!users || users.length === 0) {
        console.log('No users found');
        // Even with no users, we should emit a progress event to indicate success
        await adapter.emit(ExtractorEventType.ExtractionDataProgress, {
          progress: 100
        });
        
        // Emit the data extraction done event
        await adapter.emit(ExtractorEventType.ExtractionDataDone);
        
        adapter.state.completed = true;
        return;
      }
      
      console.log(`Fetched ${users.length} users from Trello organization`);
      
      // Initialize repository for users
      const repos = [
        {
          itemType: 'users',
          normalize: normalizeUser
        }
      ];
      
      adapter.initializeRepos(repos);
      
      // Push users to the repository
      await adapter.getRepo('users')?.push(users);
      
      // Emit progress event
      await adapter.emit(ExtractorEventType.ExtractionDataProgress, {
        progress: 100
      });
      
      // Update state to indicate completion
      adapter.state.completed = true;
      
      // Emit the data extraction done event
      await adapter.emit(ExtractorEventType.ExtractionDataDone);
      
      console.log('Users extraction completed successfully');
    } catch (error) {
      console.error('Error in users extraction:', error);
      
      // Update state to indicate error
      adapter.state.completed = false;
      adapter.state.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Emit error event
      await adapter.emit(ExtractorEventType.ExtractionDataError, {
        error: {
          message: error instanceof Error ? error.message : 'Unknown error during users extraction',
        },
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('Users extraction timed out');
    
    // Update state to indicate timeout
    adapter.state.completed = false;
    adapter.state.error = 'Users extraction timed out';
    
    // Emit error event on timeout
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: {
        message: 'Users extraction timed out',
      },
    });
  },
});