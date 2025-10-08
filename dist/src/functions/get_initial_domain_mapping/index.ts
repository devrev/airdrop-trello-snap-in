import { FunctionInput } from '../../core/types';
import initialDomainMapping from '../../initial-domain-mapping.json';

export interface GetInitialDomainMappingResult {
  initial_domain_mapping: any;
  success: boolean;
  message: string;
}

/**
 * Function that returns The Initial Domain Mapping JSON object.
 * 
 * @param events Array of function input events
 * @returns Object containing the initial domain mapping
 */
export async function run(events: FunctionInput[]): Promise<GetInitialDomainMappingResult> {
  try {
    // Process only the first event
    if (!events || events.length === 0) {
      return {
        initial_domain_mapping: {},
        success: false,
        message: 'Get initial domain mapping failed: No events provided',
      };
    }

    return {
      initial_domain_mapping: initialDomainMapping,
      success: true,
      message: 'Initial domain mapping retrieved successfully',
    };
  } catch (error) {
    console.error('Error in get_initial_domain_mapping function:', error);
    return {
      initial_domain_mapping: {},
      success: false,
      message: `Get initial domain mapping failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}