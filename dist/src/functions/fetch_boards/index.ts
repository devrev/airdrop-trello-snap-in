import { FunctionInput } from '../../core/types';
import { TrelloClient, parseConnectionData } from '../../core/trello-client';

export interface Board {
  id: string;
  name: string;
  description: string;
  item_type: string;
}

/**
 * Fetch all boards from a Trello organization
 */
const run = async (events: FunctionInput[]) => {
  // Process only the first event
  if (events.length === 0) {
    return {
      status_code: 400,
      api_delay: 0,
      message: 'No events to process',
    };
  }

  const event = events[0];

  // Validate event structure
  if (!event || !event.payload || !event.payload.connection_data) {
    const error = new Error('Invalid event structure: missing connection_data');
    console.error(error.message);
    throw error;
  }

  try {
    // Parse credentials from connection data
    const connectionDataKey = event.payload.connection_data.key;
    const organizationId = event.payload.connection_data.org_id;

    if (!connectionDataKey) {
      const error = new Error('Missing connection data key');
      console.error(error.message);
      throw error;
    }

    if (!organizationId) {
      const error = new Error('Missing organization ID');
      console.error(error.message);
      throw error;
    }

    const credentials = parseConnectionData(connectionDataKey);

    // Initialize Trello client
    const trelloClient = new TrelloClient(credentials);

    // Fetch boards
    const response = await trelloClient.getBoards(organizationId);

    // Handle rate limiting
    if (response.status_code === 429) {
      // Ensure api_delay is a valid number
      const apiDelay = typeof response.api_delay === 'number' && !isNaN(response.api_delay) 
        ? response.api_delay 
        : 3;
      
      return {
        status_code: response.status_code,
        api_delay: apiDelay,
        message: response.message,
      };
    }

    // Handle API errors
    if (response.status_code !== 200 || !response.data) {
      return {
        status_code: response.status_code,
        api_delay: response.api_delay,
        message: response.message,
      };
    }

    // Map boards according to ObjectPRD
    const boards: Board[] = response.data.map((board: any) => ({
      id: board.id,
      name: board.name,
      description: board.desc || '',
      item_type: 'cards',
    }));

    return {
      status_code: 200,
      api_delay: 0,
      message: `Successfully fetched ${boards.length} boards`,
      data: boards,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in fetch_boards:', errorMessage);
    throw error;
  }
};

export default run;