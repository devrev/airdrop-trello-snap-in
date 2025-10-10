import { spawn } from '@devrev/ts-adaas';
import { EventType, ExtractorEventType } from '@devrev/ts-adaas';
import { ExternalSyncUnit } from '@devrev/ts-adaas';
import { FunctionInput } from '../../core/types';
import { convertToAirdropEvent } from '../../core/utils';

/**
 * Function that tests the external sync units extraction workflow.
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

    // Check if the event type is EXTRACTION_EXTERNAL_SYNC_UNITS_START
    if (airdropEvent.payload.event_type !== EventType.ExtractionExternalSyncUnitsStart) {
      return {
        success: false,
        message: `Unexpected event type: ${airdropEvent.payload.event_type}. Expected: ${EventType.ExtractionExternalSyncUnitsStart}`
      };
    }

    // Spawn a worker thread to handle the external sync units extraction
    await spawn({
      event: airdropEvent,
      initialState: {},
      workerPath: `${__dirname}/worker.ts`,
    });

    return {
      success: true,
      message: 'External sync units extraction test initiated successfully'
    };
  } catch (error) {
    console.error('Error in test_external_sync_units function:', error);
    return {
      success: false,
      message: `External sync units extraction test failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}