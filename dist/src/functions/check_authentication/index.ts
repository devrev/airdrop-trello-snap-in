import { TrelloClient, parseApiCredentials, TrelloApiResponse } from '../../core/trello-client';
import { FunctionInput } from '../../core/types';

export interface AuthenticationCheckResult {
  authenticated: boolean;
  status_code: number;
  api_delay: number;
  message: string;
  raw_response: any;
  member_info?: any;
}

/**
 * Function that checks if authentication with The API works.
 * 
 * @param events Array of function input events
 * @returns Object indicating authentication status and API response metadata
 */
export async function run(events: FunctionInput[]): Promise<AuthenticationCheckResult> {
  try {
    // Process only the first event
    if (!events || events.length === 0) {
      return {
        authenticated: false,
        status_code: 0,
        api_delay: 0,
        message: 'Authentication check failed: No events provided',
        raw_response: null,
      };
    }

    const event = events[0];
    
    // Validate required environment variable
    const baseUrl = process.env.TRELLO_BASE_URL;
    if (!baseUrl) {
      return {
        authenticated: false,
        status_code: 0,
        api_delay: 0,
        message: 'Authentication check failed: TRELLO_BASE_URL environment variable not set',
        raw_response: null,
      };
    }

    // Extract connection data
    const connectionData = event.payload.connection_data;
    if (!connectionData || !connectionData.key) {
      return {
        authenticated: false,
        status_code: 0,
        api_delay: 0,
        message: 'Authentication check failed: Missing connection data or API key',
        raw_response: null,
      };
    }

    // Parse API credentials
    let apiCredentials;
    try {
      apiCredentials = parseApiCredentials(connectionData.key);
    } catch (error) {
      return {
        authenticated: false,
        status_code: 0,
        api_delay: 0,
        message: `Authentication check failed: ${error instanceof Error ? error.message : String(error)}`,
        raw_response: null,
      };
    }

    // Initialize Trello client
    const trelloClient = new TrelloClient({
      baseUrl: baseUrl,
      apiKey: apiCredentials.apiKey,
      token: apiCredentials.token,
    });

    // Make authentication check request to /members/me
    const response: TrelloApiResponse = await trelloClient.getMember('me');

    // Determine authentication status based on response
    const authenticated = response.status_code === 200 && !!response.data;

    return {
      authenticated: authenticated,
      status_code: response.status_code,
      api_delay: response.api_delay,
      message: authenticated 
        ? `Authentication successful. User: ${response.data?.fullName || response.data?.username || 'Unknown'}`
        : response.message,
      raw_response: response.raw_response,
      member_info: authenticated ? response.data : undefined,
    };

  } catch (error) {
    console.error('Error in check_authentication function:', error);
    return {
      authenticated: false,
      status_code: 0,
      api_delay: 0,
      message: `Authentication check failed: ${error instanceof Error ? error.message : String(error)}`,
      raw_response: null,
    };
  }
}