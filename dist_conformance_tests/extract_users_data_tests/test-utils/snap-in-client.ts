/**
 * Utility for communicating with the snap-in server
 */

import axios, { AxiosResponse } from 'axios';

export interface SnapInResponse {
  function_result?: any;
  error?: any;
}

/**
 * Send event to snap-in server
 */
export async function sendEventToSnapIn(
  event: any,
  serverUrl: string = 'http://localhost:8000/handle/sync'
): Promise<SnapInResponse> {
  try {
    console.log('[SnapInClient] Sending event to snap-in server:', JSON.stringify(event, null, 2));
    
    const response: AxiosResponse<SnapInResponse> = await axios.post(serverUrl, event, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 second timeout
    });

    console.log('[SnapInClient] Received response:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[SnapInClient] Axios error:', error.message);
      if (error.response) {
        console.error('[SnapInClient] Response data:', error.response.data);
        console.error('[SnapInClient] Response status:', error.response.status);
      }
      throw new Error(`Failed to send event to snap-in server: ${error.message}`);
    }
    throw error;
  }
}