import { AirdropEvent } from '@devrev/ts-adaas';
import axios from 'axios';

/**
 * Function that checks if pushing data to the callback URL works.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns Object indicating if pushing data works
 */
export const handler = async (events: AirdropEvent[]): Promise<{ can_push: boolean; message: string }> => {
  try {
    if (!events || events.length === 0) {
      throw new Error('No events provided');
    }

    const event = events[0];
    
    // Check if event context contains callback URL
    const eventContext = event.payload.event_context;
    if (!eventContext) {
      return {
        can_push: false,
        message: 'Missing event context in payload'
      };
    }

    const callbackUrl = eventContext.callback_url;
    if (!callbackUrl) {
      return {
        can_push: false,
        message: 'Missing callback URL in event context'
      };
    }

    // Create a small test payload
    const testPayload = {
      test_data: 'This is a test payload',
      timestamp: new Date().toISOString()
    };

    try {
      // Attempt to push data to the callback URL
      const response = await axios.post(callbackUrl, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': event.context.secrets?.service_account_token || ''
        },
        timeout: 10000 // 10 second timeout
      });

      // Check if the request was successful
      if (response.status >= 200 && response.status < 300) {
        return {
          can_push: true,
          message: `Successfully pushed data to callback URL. Status: ${response.status}`
        };
      } else {
        return {
          can_push: false,
          message: `Failed to push data to callback URL. Status: ${response.status}`
        };
      }
    } catch (error) {
      // Handle network errors or other axios errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        can_push: false,
        message: `Error pushing data to callback URL: ${errorMessage}`
      };
    }
  } catch (error) {
    console.error('Error in can_push_data function:', error);
    throw error;
  }
};