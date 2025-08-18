import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello_client';

/**
 * Function to fetch the list of members from a Trello organization.
 * Uses the endpoint "/organizations/{id}/members" with the organization ID from connection data.
 * 
 * @param events Array of function input events
 * @returns A success or error message with the list of members if successful
 */
export async function get_organization_members(events: FunctionInput[]): Promise<{ status: string, message: string, members?: any[] }> {
  try {
    // Only process the first event as per requirements
    if (events.length === 0) {
      throw new Error('No events provided to the function');
    }

    const event = events[0];
    const requestId = event.execution_metadata?.request_id || 'unknown';
    console.log(`Get organization members function invoked with request ID: ${requestId}`);

    // Get organization ID from connection data
    const orgId = event.payload.connection_data?.org_id;
    if (!orgId) {
      throw new Error('Organization ID not found in connection data');
    }

    // Initialize the Trello client
    const trelloClient = new TrelloClient(event);
    
    // Fetch the list of organization members
    const members = await trelloClient.getOrganizationMembers(orgId);
    
    console.log(`Successfully fetched ${members.length} members from organization ${orgId}`);
    
    // Return success with members information
    return {
      status: 'success',
      message: `Successfully fetched ${members.length} members from organization`,
      members: members.map(member => ({
        id: member.id,
        username: member.username,
        full_name: member.fullName || '',
        email: member.email || null,
        last_active: member.lastActive || null
      }))
    };
  } catch (error) {
    // Log the error with detailed information for debugging
    console.error('Error in get_organization_members function:', error);
    
    // Return error message but don't throw to provide a cleaner API response
    return {
      status: 'error',
      message: error instanceof Error 
        ? `Failed to fetch organization members: ${error.message}` 
        : 'Failed to fetch organization members: Unknown error'
    };
  }
}