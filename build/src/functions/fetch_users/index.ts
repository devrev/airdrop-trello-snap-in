import { AirdropEvent } from '@devrev/ts-adaas';
import axios from 'axios';

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
 * Function that fetches the list of users from a Trello organization.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns Object containing the fetched users or error information
 */
export const handler = async (events: AirdropEvent[]): Promise<{ success: boolean; message: string; users?: any[]; error?: any }> => {
  try {
    if (!events || events.length === 0) {
      throw new Error('No events provided');
    }

    const event = events[0];
    
    // Check if connection data is available
    const connectionData = event.payload.connection_data;
    if (!connectionData) {
      return {
        success: false,
        message: 'Missing connection data in payload'
      };
    }

    // Check if key is available in connection data
    const keyString = connectionData.key;
    if (!keyString) {
      return {
        success: false,
        message: 'Missing key in connection data'
      };
    }

    // Check if organization ID is available in connection data
    const orgId = connectionData.org_id;
    if (!orgId) {
      return {
        success: false,
        message: 'Missing organization ID in connection data'
      };
    }

    try {
      // Extract API key and token from the key string
      const { apiKey, token } = extractCredentials(keyString);
      
      // Make a request to the Trello API to fetch organization members
      const response = await axios.get(`https://api.trello.com/1/organizations/${orgId}/members`, {
        params: {
          key: apiKey,
          token: token,
          fields: 'username,fullName,initials,email,avatarUrl,bio,url'
        },
        timeout: 10000 // 10 second timeout
      });
      
      // Transform the response to use snake_case for keys
      const users = response.data.map((user: any) => ({
        id: user.id,
        username: user.username,
        full_name: user.fullName,
        initials: user.initials,
        email: user.email,
        avatar_url: user.avatarUrl,
        bio: user.bio,
        url: user.url
      }));
      
      return {
        success: true,
        message: `Successfully fetched ${users.length} users from Trello organization`,
        users: users
      };
    } catch (error) {
      // Handle API request errors
      let errorMessage = 'Unknown error occurred';
      let errorDetails = {};
      
      const axiosError = error as any;
      
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = `Failed to fetch users with status ${axiosError.response.status}: ${axiosError.response.statusText}`;
        errorDetails = {
          status: axiosError.response.status,
          data: axiosError.response.data
        };
      } else if (axiosError.request) {
        // The request was made but no response was received
        errorMessage = `Failed to fetch users: ${axiosError.message || 'No response received from Trello API'}`;
      } else if (axiosError.message) {
        // Something happened in setting up the request that triggered an Error
        errorMessage = `Failed to fetch users: ${axiosError.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Failed to fetch users: ${error.message}`;
      }
      
      return {
        success: false,
        message: errorMessage,
        error: errorDetails
      };
    }
  } catch (error) {
    console.error('Error in fetch_users function:', error);
    throw error;
  }
};