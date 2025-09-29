import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

export interface AuthenticationCheckResult {
  authenticated: boolean;
  status_code: number;
  api_delay: number;
  message: string;
}

/**
 * Function that checks if authentication with Trello API works.
 * 
 * @param events Array of function input events
 * @returns Object indicating authentication status
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
      };
    }

    const event = events[0];
    
    // Extract connection data
    const connectionData = event.payload.connection_data;
    if (!connectionData || !connectionData.key) {
      return {
        authenticated: false,
        status_code: 0,
        api_delay: 0,
        message: 'Authentication check failed: Missing connection data',
      };
    }

    // Parse API credentials
    let credentials;
    try {
      credentials = TrelloClient.parseCredentials(connectionData.key);
    } catch (error) {
      return {
        authenticated: false,
        status_code: 0,
        api_delay: 0,
        message: `Authentication check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }

    // Initialize Trello client and test authentication
    const trelloClient = new TrelloClient({
      apiKey: credentials.apiKey,
      token: credentials.token,
    });

    const response = await trelloClient.getCurrentMember();

    return {
      authenticated: response.status_code === 200,
      status_code: response.status_code,
      api_delay: response.api_delay,
      message: response.message,
    };
  } catch (error) {
    console.error('Error in check_authentication function:', error);
    return {
      authenticated: false,
      status_code: 0,
      api_delay: 0,
      message: `Authentication check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}