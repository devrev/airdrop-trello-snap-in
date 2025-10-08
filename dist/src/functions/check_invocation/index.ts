import { FunctionInput } from '../../core/types';

/**
 * Function that checks if it can be invoked.
 * 
 * @param events Array of function input events
 * @returns Object indicating the function can be invoked
 */
export async function run(events: FunctionInput[]): Promise<{ can_be_invoked: boolean, message: string }> {
  try {
    // Process only the first event
    if (!events || events.length === 0) {
      throw new Error('No events provided');
    }

    // Return a simple response indicating the function can be invoked
    return {
      can_be_invoked: true,
      message: 'Function can be invoked successfully'
    };
  } catch (error) {
    console.error('Error in check_invocation function:', error);
    return {
      can_be_invoked: false,
      message: `Function invocation check failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}