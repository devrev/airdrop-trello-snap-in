import { spawn } from '@devrev/ts-adaas';
import { EventType } from '@devrev/ts-adaas';
import { FunctionInput } from '../../core/types';
import { convertToAirdropEvent } from '../../core/utils';

/**
 * Function that tests the data extraction workflow.
 * 
 * @param events Array of function input events
 * @returns Object indicating the function execution status
 */
export async function run(events: FunctionInput[]): Promise<{ success: boolean, message: string }> {
  try {
    // Process only the first event
    if (!events || events.length === 0) {
      throw new Error('No events provided');
    }

    const event = events[0];
    const airdropEvent = convertToAirdropEvent(event);

    // Check if the event type is EXTRACTION_DATA_START or EXTRACTION_DATA_CONTINUE
    if (
      airdropEvent.payload.event_type !== EventType.ExtractionDataStart && 
      airdropEvent.payload.event_type !== EventType.ExtractionDataContinue
    ) {
      return {
        success: false,
        message: `Unexpected event type: ${airdropEvent.payload.event_type}. Expected: ${EventType.ExtractionDataStart} or ${EventType.ExtractionDataContinue}`
      };
    }

    // Spawn a worker thread to handle the data extraction
    await spawn({
      event: airdropEvent,
      initialState: {
        users: { completed: false }
      },
      workerPath: `${__dirname}/worker.ts`,
    });

    return {
      success: true,
      message: 'Data extraction check initiated successfully'
    };
  } catch (error) {
    console.error('Error in data_extraction_check function:', error);
    return {
      success: false,
      message: `Data extraction check failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}