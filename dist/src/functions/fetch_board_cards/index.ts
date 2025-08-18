import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello_client';

/**
 * Function to fetch cards for a specific board from Trello API.
 * Uses the endpoint "/boards/{id}/cards" with pagination support.
 * 
 * @param events Array of function input events
 * @returns A success or error message with the list of cards if successful
 */
export async function fetch_board_cards(events: FunctionInput[]): Promise<{ status: string, message: string, cards?: any[] }> {
  try {
    // Only process the first event as per requirements
    if (events.length === 0) {
      throw new Error('No events provided to the function');
    }

    const event = events[0];
    const requestId = event.execution_metadata?.request_id || 'unknown';
    console.log(`Fetch board cards function invoked with request ID: ${requestId}`);

    // Get board ID from event context
    const boardId = event.payload.event_context?.external_sync_unit_id;
    if (!boardId) {
      throw new Error('Board ID not found in event context (external_sync_unit_id)');
    }

    // Get pagination parameters from payload
    const limit = event.payload.limit;
    if (!limit || typeof limit !== 'number' || limit <= 0) {
      throw new Error('Invalid or missing limit parameter. Limit must be a positive number.');
    }

    const before = event.payload.before;
    // 'before' is optional, but if provided it should be a string
    if (before !== undefined && typeof before !== 'string') {
      throw new Error('Invalid before parameter. Before must be a string if provided.');
    }

    // Initialize the Trello client
    const trelloClient = new TrelloClient(event);
    
    // Fetch the cards for the board with pagination
    const cards = await trelloClient.getBoardCards(boardId, limit, before);
    
    console.log(`Successfully fetched ${cards.length} cards from board ${boardId}`);
    
    // Return success with cards information
    return {
      status: 'success',
      message: `Successfully fetched ${cards.length} cards from board`,
      cards: cards.map(card => ({
        id: card.id,
        name: card.name,
        description: card.desc || '',
        url: card.url,
        short_url: card.shortUrl,
        closed: card.closed,
        list_id: card.idList,
        board_id: card.idBoard,
        due: card.due,
        due_complete: card.dueComplete,
        date_last_activity: card.dateLastActivity,
        position: card.pos,
        labels: card.labels || [],
        members: card.idMembers || []
      }))
    };
  } catch (error) {
    // Log the error with detailed information for debugging
    console.error('Error in fetch_board_cards function:', error);
    
    // Return error message but don't throw to provide a cleaner API response
    return {
      status: 'error',
      message: error instanceof Error 
        ? `Failed to fetch board cards: ${error.message}` 
        : 'Failed to fetch board cards: Unknown error'
    };
  }
}