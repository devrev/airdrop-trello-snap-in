import { FunctionInput } from '../../core/types';

/**
 * Health check function that verifies the function can be invoked.
 * This is a simple function that returns a success status without performing any complex operations.
 */
const run = async (events: FunctionInput[]) => {
  // Process only the first event as per the requirements
  if (events.length === 0) {
    return {
      success: true,
      message: 'Health check passed - no events to process',
    };
  }

  const event = events[0];

  // Verify basic event structure
  if (!event || !event.execution_metadata) {
    throw new Error('Invalid event structure: missing execution_metadata');
  }

  // Return success response
  return {
    success: true,
    message: 'Health check passed',
    function_name: event.execution_metadata.function_name,
    request_id: event.execution_metadata.request_id,
  };
};

export default run;