import { convertToAirdropEvent } from '../../core/utils';
import { FunctionInput } from '../../core/types';
import { spawn, EventType } from '@devrev/ts-adaas';

/**
 * Data extraction check function that provides a test of the data extraction workflow.
 * Handles EXTRACTION_DATA_START and EXTRACTION_DATA_CONTINUE events.
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

    // Check if this is a supported event type
    if (event.payload.event_type === EventType.ExtractionDataStart || 
        event.payload.event_type === EventType.ExtractionDataContinue) {
      
      const workerPath = __dirname + '/workers/data-extraction-check.ts';
      
      await spawn({
        event: convertToAirdropEvent(event),
        workerPath: workerPath,
        initialState: {},
        initialDomainMapping: {},
      });
    } else {
      throw new Error(`Unsupported event type: ${event.payload.event_type}. Expected: ${EventType.ExtractionDataStart} or ${EventType.ExtractionDataContinue}`);
    }
  } catch (error) {
    console.error('Data extraction check function error:', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export default run;