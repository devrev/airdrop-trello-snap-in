import { convertToAirdropEvent } from '../../core/utils';
import { FunctionInput } from '../../core/types';
import { spawn, EventType } from '@devrev/ts-adaas';

/**
 * Test function for external sync units extraction workflow.
 * Handles EXTRACTION_EXTERNAL_SYNC_UNITS_START event and emits EXTRACTION_EXTERNAL_SYNC_UNITS_DONE.
 */
const run = async (events: FunctionInput[]): Promise<void> => {
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

    if (!event.payload.event_type) {
      throw new Error('Invalid event: missing event_type in payload');
    }

    // Check if this is the expected event type
    if (event.payload.event_type === EventType.ExtractionExternalSyncUnitsStart) {
      const workerPath = __dirname + '/workers/external-sync-units-test.ts';
      
      await spawn({
        event: convertToAirdropEvent(event),
        workerPath: workerPath,
        initialState: {},
      });
    } else {
      throw new Error(`Unsupported event type: ${event.payload.event_type}. Expected: ${EventType.ExtractionExternalSyncUnitsStart}`);
    }
  } catch (error) {
    console.error('Test external sync units function error:', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export default run;