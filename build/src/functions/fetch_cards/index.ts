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
 * Function that fetches the list of cards for a specific board from Trello API.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns Object containing the fetched cards or error information
 */
export const handler = async (events: AirdropEvent[]): Promise<{ success: boolean; message: string; cards?: any[]; error?: any }> => {
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

    // Check if event context is available
    const eventContext = event.payload.event_context;
    if (!eventContext) {
      return {
        success: false,
        message: 'Missing event context in payload'
      };
    }

    // Check if board ID is available in event context
    const boardId = eventContext.external_sync_unit_id;
    if (!boardId) {
      return {
        success: false,
        message: 'Missing board ID in event context'
      };
    }

    try {
      // Extract API key and token from the key string
      const { apiKey, token } = extractCredentials(keyString);
      
      // Make a request to the Trello API to fetch cards for the specified board
      const response = await axios.get(`https://api.trello.com/1/boards/${boardId}/cards`, {
        params: {
          key: apiKey,
          token: token,
          fields: 'name,desc,closed,idList,idBoard,url,shortUrl,due,dueComplete,labels,idMembers'
        },
        timeout: 10000 // 10 second timeout
      });
      
      // Transform the response to use snake_case for keys
      const cards = response.data.map((card: any) => ({
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
        member_ids: card.idMembers || []
      }));
      
      return {
        success: true,
        message: `Successfully fetched ${cards.length} cards from board ${boardId}`,
        cards: cards
      };
    } catch (error) {
      // Handle API request errors
      let errorMessage = 'Unknown error occurred';
      let errorDetails = {};
      
      const axiosError = error as any;
      
      if (axiosError.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = `Failed to fetch cards with status ${axiosError.response.status}: ${axiosError.response.statusText}`;
        errorDetails = {
          status: axiosError.response.status,
          data: axiosError.response.data
        };
      } else if (axiosError.request) {
        // The request was made but no response was received
        errorMessage = `Failed to fetch cards: ${axiosError.message || 'No response received from Trello API'}`;
      } else if (axiosError.message) {
        // Something happened in setting up the request that triggered an Error
        errorMessage = `Failed to fetch cards: ${axiosError.message}`;
      } else if (error instanceof Error) {
        errorMessage = `Failed to fetch cards: ${error.message}`;
      }
      
      return {
        success: false,
        message: errorMessage,
        error: errorDetails
      };
    }
  } catch (error) {
    console.error('Error in fetch_cards function:', error);
    throw error;
  }
};