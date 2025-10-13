import { FunctionInput } from '../../core/types';
import initialDomainMapping from '../../core/initial-domain-mapping.json';

export interface GetInitialDomainMappingResponse {
  status: 'success' | 'failure';
  message: string;
  timestamp: string;
  mapping?: any;
}

/**
 * Get initial domain mapping function that generates and returns The Initial Domain Mapping JSON object.
 * Returns mapping with 'users' record type mapping to 'devu' with appropriate field mappings.
 */
const run = async (events: FunctionInput[]): Promise<GetInitialDomainMappingResponse> => {
  try {
    // Validate input
    if (!events || !Array.isArray(events)) {
      throw new Error('Invalid input: events must be an array');
    }

    if (events.length === 0) {
      throw new Error('Invalid input: events array cannot be empty');
    }

    // Process only the first event as per requirements
    const event = events[0];

    // Validate event structure
    if (!event) {
      throw new Error('Invalid event: event cannot be null or undefined');
    }

    if (!event.payload) {
      throw new Error('Invalid event: missing payload');
    }

    if (!event.context) {
      throw new Error('Invalid event: missing context');
    }

    if (!event.execution_metadata) {
      throw new Error('Invalid event: missing execution_metadata');
    }

    // Validate required context fields
    if (!event.context.dev_oid) {
      throw new Error('Invalid event: missing dev_oid in context');
    }

    if (!event.context.snap_in_id) {
      throw new Error('Invalid event: missing snap_in_id in context');
    }

    // Validate required execution metadata fields
    if (!event.execution_metadata.request_id) {
      throw new Error('Invalid event: missing request_id in execution_metadata');
    }

    if (!event.execution_metadata.function_name) {
      throw new Error('Invalid event: missing function_name in execution_metadata');
    }

    const timestamp = new Date().toISOString();

    // Return success response with initial domain mapping
    return {
      status: 'success',
      message: 'Successfully retrieved initial domain mapping',
      timestamp,
      mapping: initialDomainMapping,
    };
  } catch (error) {
    const timestamp = new Date().toISOString();
    
    // Log error for debugging purposes
    console.error('Get initial domain mapping function error:', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      timestamp,
    });

    // Return failure response for any errors
    return {
      status: 'failure',
      message: error instanceof Error ? error.message : 'Unknown error occurred during mapping retrieval',
      timestamp,
    };
  }
};

export default run;