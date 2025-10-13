import { FunctionInput } from '../../core/types';

/**
 * Health check function that verifies the function can be invoked successfully.
 * This function performs basic validation and returns a success response.
 */
const run = async (events: FunctionInput[]): Promise<{ status: string; message: string; timestamp: string }> => {
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

    // Basic validation of the event structure
    if (!event) {
      throw new Error('Invalid event: event cannot be null or undefined');
    }

    if (!event.context) {
      throw new Error('Invalid event: missing context');
    }

    if (!event.execution_metadata) {
      throw new Error('Invalid event: missing execution_metadata');
    }

    if (!event.payload) {
      throw new Error('Invalid event: missing payload');
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

    // Return success response
    return {
      status: 'success',
      message: 'Function can be invoked successfully',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    // Log error for debugging purposes
    console.error('Health check function error:', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Re-throw the error to indicate function invocation failure
    throw error;
  }
};

export default run;