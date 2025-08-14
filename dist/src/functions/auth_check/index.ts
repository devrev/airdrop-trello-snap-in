import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello_client';

/**
 * Authentication check function that verifies if the provided Trello API credentials are valid.
 * Makes a request to the Trello API endpoint "/members/me" to verify authentication.
 * 
 * @param events Array of function input events
 * @returns A success or error message indicating if authentication was successful
 */
export async function auth_check(events: FunctionInput[]): Promise<{ status: string, message: string, user?: any }> {
  try {
    // Only process the first event as per requirements
    if (events.length === 0) {
      throw new Error('No events provided to the function');
    }

    const event = events[0];
    const requestId = event.execution_metadata?.request_id || 'unknown';
    console.log(`Auth check function invoked with request ID: ${requestId}`);

    // Initialize the Trello client
    const trelloClient = new TrelloClient(event);
    
    // Attempt to get the current member to verify authentication
    const member = await trelloClient.getCurrentMember();
    
    console.log(`Authentication successful for user: ${member.username || member.id}`);
    
    // Return success with user information
    return {
      status: 'success',
      message: 'Authentication with Trello API successful',
      user: {
        id: member.id,
        username: member.username,
        full_name: member.fullName,
        email: member.email,
      }
    };
  } catch (error) {
    // Log the error with detailed information for debugging
    console.error('Error in auth_check function:', error);
    
    // Return error message but don't throw to provide a cleaner API response
    return {
      status: 'error',
      message: error instanceof Error 
        ? `Authentication failed: ${error.message}` 
        : 'Authentication failed: Unknown error'
    };
  }
}