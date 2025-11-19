import { FunctionInput } from '../../core/types';
import { TrelloClient, parseConnectionData } from '../../core/trello-client';

export interface User {
  id: string;
  full_name: string;
  username: string;
  email: string;
}

/**
 * Fetch all users from a Trello organization
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

    // Fetch organization members
    const membersResponse = await trelloClient.getOrganizationMembers(organizationId);

    // Handle rate limiting
    if (membersResponse.status_code === 429) {
      const apiDelay = typeof membersResponse.api_delay === 'number' && !isNaN(membersResponse.api_delay)
        ? membersResponse.api_delay
        : 3;

      return {
        status_code: membersResponse.status_code,
        api_delay: apiDelay,
        message: membersResponse.message,
      };
    }

    // Handle API errors
    if (membersResponse.status_code !== 200 || !membersResponse.data) {
      return {
        status_code: membersResponse.status_code,
        api_delay: membersResponse.api_delay,
        message: membersResponse.message,
      };
    }

    // Fetch detailed information for each member asynchronously
    let rateLimited = false;
    let delay = 0;

    const userDetailsPromises = membersResponse.data.map(async (member: any) => {
      // Skip if already rate limited
      if (rateLimited) return null;

      const detailsResponse = await trelloClient.getMemberDetails(member.id);

      // Handle rate limiting
      if (detailsResponse.status_code === 429) {
        rateLimited = true;
        delay = typeof detailsResponse.api_delay === 'number' && !isNaN(detailsResponse.api_delay)
          ? detailsResponse.api_delay
          : 3;
        return null;
      }

      // Handle API errors
      if (detailsResponse.status_code !== 200 || !detailsResponse.data) {
        return null;
      }

      return {
        id: member.id,
        full_name: member.fullName,
        username: member.username,
        email: detailsResponse.data.email || '',
      };
    });

    const userDetails = await Promise.all(userDetailsPromises);

    // Check if rate limited during member details fetching
    if (rateLimited) {
      return {
        status_code: 429,
        api_delay: delay,
        message: 'Rate limit exceeded',
      };
    }

    // Filter out null values (failed requests)
    const users: User[] = userDetails.filter((user): user is User => user !== null);

    return {
      status_code: 200,
      api_delay: 0,
      message: `Successfully fetched ${users.length} users`,
      data: users,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in fetch_users:', errorMessage);
    throw error;
  }
};

export default run;