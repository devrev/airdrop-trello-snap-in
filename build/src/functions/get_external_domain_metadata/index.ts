import { FunctionInput } from '../../core/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Function to retrieve the external domain metadata JSON object.
 * Returns the metadata that defines the structure of the external system's data model.
 * 
 * @param events Array of function input events
 * @returns The external domain metadata JSON object
 */
export async function get_external_domain_metadata(events: FunctionInput[]): Promise<{ status: string, message: string, metadata?: any }> {
  try {
    // Only process the first event as per requirements
    if (events.length === 0) {
      throw new Error('No events provided to the function');
    }

    const requestId = events[0].execution_metadata?.request_id || 'unknown';
    console.log(`Get external domain metadata function invoked with request ID: ${requestId}`);

    // Path to the external domain metadata JSON file
    const metadataFilePath = path.resolve(__dirname, '../../core/external_domain_metadata.json');
    
    // Read the metadata file
    const metadataContent = fs.readFileSync(metadataFilePath, 'utf8');
    const metadata = JSON.parse(metadataContent);
    
    console.log('Successfully retrieved external domain metadata');
    
    // Return success with the metadata
    return {
      status: 'success',
      message: 'Successfully retrieved external domain metadata',
      metadata: metadata
    };
  } catch (error) {
    // Log the error with detailed information for debugging
    console.error('Error in get_external_domain_metadata function:', error);
    
    // Return error message but don't throw to provide a cleaner API response
    return {
      status: 'error',
      message: error instanceof Error 
        ? `Failed to retrieve external domain metadata: ${error.message}` 
        : 'Failed to retrieve external domain metadata: Unknown error'
    };
  }
}