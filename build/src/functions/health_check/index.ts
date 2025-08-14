import { FunctionInput } from '../../core/types';

/**
 * Health check function that verifies if the function can be invoked.
 * 
 * @param events Array of function input events
 * @returns A success message indicating the function can be invoked
 */
export async function health_check(events: FunctionInput[]): Promise<{ status: string, message: string }> {
  try {
    // Only process the first event as per requirements
    if (events.length === 0) {
      throw new Error('No events provided to the function');
    }

    // Log the request ID for debugging purposes
    const requestId = events[0].execution_metadata?.request_id || 'unknown';
    console.log(`Health check function invoked with request ID: ${requestId}`);

    // Return a success response
    return {
      status: 'success',
      message: 'Function is operational and can be invoked successfully'
    };
  } catch (error) {
    // Log the error with detailed information for debugging
    console.error('Error in health_check function:', error);
    throw error;
  }
}