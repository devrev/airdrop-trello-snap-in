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
 * Function that checks if authentication with the Trello API works.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns Object indicating if authentication works
 */
export const handler = async (events: AirdropEvent[]): Promise<{ authenticated: boolean; message: string; details?: any }> => {
  try {
    if (!events || events.length === 0) {
      throw new Error('No events provided');
    }

    const event = events[0];
    
    // Check if connection data is available
    const connectionData = event.payload.connection_data;
    if (!connectionData) {
      return {
        authenticated: false,
        message: 'Missing connection data in payload'
      };
    }

    // Check if key is available in connection data
    const keyString = connectionData.key;
    if (!keyString) {
      return {
        authenticated: false,
        message: 'Missing key in connection data'
      };
    }

    try {
      // Extract API key and token from the key string
      const { apiKey, token } = extractCredentials(keyString);
      
      // Make a simple request to the Trello API to verify credentials
      // We'll use the /members/me/boards endpoint which requires authentication
      const response = await axios.get('https://api.trello.com/1/members/me/boards', {
        params: {
          key: apiKey,
          token: token,
          fields: 'name' // Only request minimal data
        },
        timeout: 10000 // 10 second timeout
      });
      
      // If we get here, authentication was successful
      return {
        authenticated: true,
        message: 'Successfully authenticated with Trello API'
      };
    } catch (error) {
      // Handle API request errors
      let errorMessage = 'Unknown error occurred';
      let errorDetails = {};
      
      const axiosError = error as any;
      
      if (axiosError.response) {
        // Handle Axios errors
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = `Authentication failed with status ${axiosError.response.status}: ${axiosError.response.statusText}`;
        errorDetails = {
          status: axiosError.response.status,
          data: axiosError.response.data
        };
      } else if (axiosError.request) {
        // The request was made but no response was received
        errorMessage = 'Authentication failed: No response received from Trello API';
      } else if (axiosError.message) {
        // Something happened in setting up the request that triggered an Error
        errorMessage = `Authentication failed: ${axiosError.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Authentication failed: ${error.message}`;
      }
      
      return {
        authenticated: false,
        message: errorMessage,
        details: errorDetails
      };
    }
  } catch (error) {
    console.error('Error in check_auth function:', error);
    throw error;
  }
};