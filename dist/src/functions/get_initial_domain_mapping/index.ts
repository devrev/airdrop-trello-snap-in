import { FunctionInput } from '../../core/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Function to retrieve the initial domain mapping JSON object.
 * Returns the mapping that defines how external system data maps to DevRev objects.
 * 
 * @param events Array of function input events
 * @returns The initial domain mapping JSON object
 */
export async function get_initial_domain_mapping(events: FunctionInput[]): Promise<{ status: string, message: string, mapping?: any }> {
  try {
    // Only process the first event as per requirements
    if (events.length === 0) {
      throw new Error('No events provided to the function');
    }

    const requestId = events[0].execution_metadata?.request_id || 'unknown';
    console.log(`Get initial domain mapping function invoked with request ID: ${requestId}`);

    // Path to the initial domain mapping JSON file
    const mappingFilePath = path.resolve(__dirname, '../../core/initial_domain_mapping.json');
    
    // Read the mapping file
    const mappingContent = fs.readFileSync(mappingFilePath, 'utf8');
    const mapping = JSON.parse(mappingContent);
    
    console.log('Successfully retrieved initial domain mapping');
    
    // Return success with the mapping
    return {
      status: 'success',
      message: 'Successfully retrieved initial domain mapping',
      mapping: mapping
    };
  } catch (error) {
    // Log the error with detailed information for debugging
    console.error('Error in get_initial_domain_mapping function:', error);
    
    // Return error message but don't throw to provide a cleaner API response
    return {
      status: 'error',
      message: error instanceof Error 
        ? `Failed to retrieve initial domain mapping: ${error.message}` 
        : 'Failed to retrieve initial domain mapping: Unknown error'
    };
  }
}