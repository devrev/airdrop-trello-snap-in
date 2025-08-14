import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello_client';

/**
 * Function to fetch the list of boards from Trello API.
 * Uses the endpoint "/members/{id}/boards" with "me" as the id parameter.
 * 
 * @param events Array of function input events
 * @returns A success or error message with the list of boards if successful
 */
export async function get_boards(events: FunctionInput[]): Promise<{ status: string, message: string, boards?: any[] }> {
  try {
    // Only process the first event as per requirements
    if (events.length === 0) {
      throw new Error('No events provided to the function');
    }

    const event = events[0];
    const requestId = event.execution_metadata?.request_id || 'unknown';
    console.log(`Get boards function invoked with request ID: ${requestId}`);

    // Initialize the Trello client
    const trelloClient = new TrelloClient(event);
    
    // Fetch the list of boards
    const boards = await trelloClient.getBoards();
    
    console.log(`Successfully fetched ${boards.length} boards`);
    
    // Return success with boards information
    return {
      status: 'success',
      message: `Successfully fetched ${boards.length} boards`,
      boards: boards.map(board => ({
        id: board.id,
        name: board.name,
        description: board.desc || '',
        url: board.url,
        closed: board.closed,
        organization_id: board.idOrganization,
        last_activity_date: board.dateLastActivity
      }))
    };
  } catch (error) {
    // Log the error with detailed information for debugging
    console.error('Error in get_boards function:', error);
    
    // Return error message but don't throw to provide a cleaner API response
    return {
      status: 'error',
      message: error instanceof Error 
        ? `Failed to fetch boards: ${error.message}` 
        : 'Failed to fetch boards: Unknown error'
    };
  }
}