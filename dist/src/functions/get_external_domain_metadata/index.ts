import { FunctionInput } from '../../core/types';
import externalDomainMetadata from '../../core/external-domain-metadata.json';

export interface GetExternalDomainMetadataResponse {
  status: 'success' | 'failure';
  message: string;
  timestamp: string;
  metadata?: any;
}

/**
 * Get external domain metadata function that generates and returns The External Domain Metadata JSON object.
 * Returns metadata with 'users' record type containing full_name and username fields.
 */
const run = async (events: FunctionInput[]): Promise<GetExternalDomainMetadataResponse> => {
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

    // Return success response with external domain metadata
    return {
      status: 'success',
      message: 'Successfully retrieved external domain metadata',
      timestamp,
      metadata: externalDomainMetadata,
    };
  } catch (error) {
    const timestamp = new Date().toISOString();
    
    // Log error for debugging purposes
    console.error('Get external domain metadata function error:', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      timestamp,
    });

    // Return failure response for any errors
    return {
      status: 'failure',
      message: error instanceof Error ? error.message : 'Unknown error occurred during metadata retrieval',
      timestamp,
    };
  }
};

export default run;