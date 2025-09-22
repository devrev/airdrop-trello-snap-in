import { TrelloClient, parseApiCredentials, TrelloApiResponse } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';

export interface FetchOrganizationMembersResult {
  success: boolean;
  status_code: number;
  api_delay: number;
  message: string;
  raw_response: any;
  members?: any[];
}

/**
 * Function that fetches members of a Trello organization.
 * 
 * @param events Array of function input events
 * @returns Object containing the fetched organization members and API response metadata
 */
export async function run(events: FunctionInput[]): Promise<FetchOrganizationMembersResult> {
  try {
    // Process only the first event
    if (!events || events.length === 0) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Fetch organization members failed: No events provided',
        raw_response: null,
      };
    }

    const event = events[0];
    
    // Validate required environment variable
    const baseUrl = process.env.TRELLO_BASE_URL;
    if (!baseUrl) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Fetch organization members failed: TRELLO_BASE_URL environment variable not set',
        raw_response: null,
      };
    }

    // Extract connection data
    const connectionData = event.payload.connection_data;
    if (!connectionData || !connectionData.key) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Fetch organization members failed: Missing connection data or API key',
        raw_response: null,
      };
    }

    // Get organization ID
    const organizationId = connectionData.org_id;
    if (!organizationId) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: 'Fetch organization members failed: Missing organization ID',
        raw_response: null,
      };
    }

    // Parse API credentials
    let apiCredentials;
    try {
      apiCredentials = parseApiCredentials(connectionData.key);
    } catch (error) {
      return {
        success: false,
        status_code: 0,
        api_delay: 0,
        message: `Fetch organization members failed: ${error instanceof Error ? error.message : String(error)}`,
        raw_response: null,
      };
    }

    // Initialize Trello client
    const trelloClient = new TrelloClient({
      baseUrl: baseUrl,
      apiKey: apiCredentials.apiKey,
      token: apiCredentials.token,
    });

    // Fetch members of the organization
    const response: TrelloApiResponse = await trelloClient.getOrganizationMembers(organizationId);

    // Determine success based on response
    const success = response.status_code === 200 && !!response.data;

    return {
      success: success,
      status_code: response.status_code,
      api_delay: response.api_delay,
      message: success 
        ? `Successfully fetched ${Array.isArray(response.data) ? response.data.length : 0} organization members`
        : response.message,
      raw_response: response.raw_response,
      members: success ? response.data : undefined,
    };

  } catch (error) {
    console.error('Error in fetch_organization_members function:', error);
    return {
      success: false,
      status_code: 0,
      api_delay: 0,
      message: `Fetch organization members failed: ${error instanceof Error ? error.message : String(error)}`,
      raw_response: null,
    };
  }
}