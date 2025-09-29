import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

export interface FetchOrganizationMembersResult {
  members?: any[];
  status_code: number;
  api_delay: number;
  message: string;
}

/**
 * Function that fetches organization members from Trello API.
 * 
 * @param events Array of function input events
 * @returns Object containing organization members data and API response info
 */
export async function run(events: FunctionInput[]): Promise<FetchOrganizationMembersResult> {
  try {
    // Process only the first event
    if (!events || events.length === 0) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Fetch organization members failed: No events provided',
      };
    }

    const event = events[0];
    
    // Extract connection data
    const connectionData = event.payload.connection_data;
    if (!connectionData || !connectionData.key) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Fetch organization members failed: Missing connection data',
      };
    }

    // Extract organization ID
    if (!connectionData.org_id) {
      return {
        status_code: 0,
        api_delay: 0,
        message: 'Fetch organization members failed: Missing organization ID',
      };
    }

    // Parse API credentials
    let credentials;
    try {
      credentials = TrelloClient.parseCredentials(connectionData.key);
    } catch (error) {
      return {
        status_code: 0,
        api_delay: 0,
        message: `Fetch organization members failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Initialize Trello client and fetch organization members
    const trelloClient = new TrelloClient({
      apiKey: credentials.apiKey,
      token: credentials.token,
    });

    const response = await trelloClient.getOrganizationMembers(connectionData.org_id);

    const result: FetchOrganizationMembersResult = {
      status_code: response.status_code,
      api_delay: response.api_delay,
      message: response.message,
    };

    // Include members data if successful
    if (response.status_code === 200 && response.data) {
      result.members = response.data;
    }

    return result;
  } catch (error) {
    console.error('Error in fetch_organization_members function:', error);
    return {
      status_code: 0,
      api_delay: 0,
      message: `Fetch organization members failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}