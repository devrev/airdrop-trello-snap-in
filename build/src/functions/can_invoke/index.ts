import { AirdropEvent } from '@devrev/ts-adaas';

/**
 * Function that checks if it can be invoked.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns Object indicating successful invocation
 */
export const handler = async (events: AirdropEvent[]): Promise<{ success: boolean; message: string }> => {
  try {
    // Log the invocation for debugging purposes
    console.log('Can invoke function called successfully');
    
    // Return a success response
    return {
      success: true,
      message: 'Function can be invoked successfully',
    };
  } catch (error) {
    // Log the error for debugging
    console.error('Error in can_invoke function:', error);
    
    // Return an error response
    throw error;
  }
};