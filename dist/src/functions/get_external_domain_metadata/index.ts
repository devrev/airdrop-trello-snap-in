import { FunctionInput } from '../../core/types';
import externalDomainMetadata from '../../external-domain-metadata.json';

export interface GetExternalDomainMetadataResult {
  external_domain_metadata: any;
  success: boolean;
  message: string;
}

/**
 * Function that returns The External Domain Metadata JSON object.
 * 
 * @param events Array of function input events
 * @returns Object containing the external domain metadata
 */
export async function run(events: FunctionInput[]): Promise<GetExternalDomainMetadataResult> {
  try {
    // Process only the first event
    if (!events || events.length === 0) {
      return {
        external_domain_metadata: {},
        success: false,
        message: 'Get external domain metadata failed: No events provided',
      };
    }

    return {
      external_domain_metadata: externalDomainMetadata,
      success: true,
      message: 'External domain metadata retrieved successfully',
    };
  } catch (error) {
    console.error('Error in get_external_domain_metadata function:', error);
    return {
      external_domain_metadata: {},
      success: false,
      message: `Get external domain metadata failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}