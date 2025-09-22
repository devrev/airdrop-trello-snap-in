import { FunctionInput } from '../../core/types';
import externalDomainMetadata from './external_domain_metadata.json';

/**
 * Function that returns the External Domain Metadata JSON object.
 * 
 * @param events Array of function input events
 * @returns Object containing the External Domain Metadata JSON object
 */
export async function run(events: FunctionInput[]): Promise<{ success: boolean, message: string, metadata: any }> {
  try {
    // Return the External Domain Metadata JSON object
    return {
      success: true,
      message: 'Successfully retrieved External Domain Metadata',
      metadata: externalDomainMetadata
    };
  } catch (error) {
    console.error('Error in get_external_domain_metadata function:', error);
    return {
      success: false,
      message: `Failed to retrieve External Domain Metadata: ${error instanceof Error ? error.message : String(error)}`,
      metadata: null
    };
  }
}