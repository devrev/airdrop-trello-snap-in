import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

export interface FetchOrganizationMembersResponse {
  status: 'success' | 'failure';
  status_code: number;
  api_delay: number;
  message: string;
  timestamp: string;
  members?: Array<{
    id: string;
    full_name?: string;
    username?: string;
    last_active?: string;
    [key: string]: any;
  }>;
}

/**
 * Fetch organization members function that retrieves the list of members for a specific organization.
 * Makes a request to /organizations/{id}/members endpoint.
 */
const run = async (events: FunctionInput[]): Promise<FetchOrganizationMembersResponse> => {
  try {
    // Validate input
    if (!events || !Array.isArray(events)) {
      throw new Error('Invalid input: events must be an array');
    }

    if (events.length === 0) {
      throw new Error('Invalid input: events array cannot be empty');
    }

    // Process only the first event as per requirements
    const event = events[0];

    // Validate event structure
    if (!event) {
      throw new Error('Invalid event: event cannot be null or undefined');
    }

    if (!event.payload) {
      throw new Error('Invalid event: missing payload');
    }

    if (!event.payload.connection_data) {
      throw new Error('Invalid event: missing connection_data in payload');
    }

    if (!event.payload.connection_data.key) {
      throw new Error('Invalid event: missing key in connection_data');
    }

    if (!event.payload.connection_data.org_id) {
      throw new Error('Invalid event: missing org_id in connection_data');
    }

    // Create Trello client from connection data
    const trelloClient = TrelloClient.fromConnectionData(event.payload.connection_data.key);

    // Fetch organization members from Trello API
    const response = await trelloClient.getOrganizationMembers(event.payload.connection_data.org_id);

    const timestamp = new Date().toISOString();

    if (response.status_code === 200 && response.data) {
      // Successfully fetched organization members
      return {
        status: 'success',
        status_code: response.status_code,
        api_delay: response.api_delay,
        message: response.message,
        timestamp,
        members: response.data.map(member => {
          const { fullName, lastActive, ...memberWithoutCamelCase } = member;
          return {
            ...memberWithoutCamelCase,
            full_name: fullName,
            last_active: lastActive,
          };
        }),
      };
    } else {
      // Failed to fetch organization members
      return {
        status: 'failure',
        status_code: response.status_code,
        api_delay: response.api_delay,
        message: response.message,
        timestamp,
      };
    }
  } catch (error) {
    const timestamp = new Date().toISOString();
    
    // Log error for debugging purposes
    console.error('Fetch organization members function error:', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      timestamp,
    });

    // Return failure response for any errors
    return {
      status: 'failure',
      status_code: 500,
      api_delay: 0,
      message: error instanceof Error ? error.message : 'Unknown error occurred during organization members fetching',
      timestamp,
    };
  }
};

export default run;