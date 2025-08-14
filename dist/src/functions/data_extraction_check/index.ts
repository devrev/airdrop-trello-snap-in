import { spawn } from '@devrev/ts-adaas';
import { EventType } from '@devrev/ts-adaas';
import { convertToAirdropEvent } from '../../core/utils';
import { FunctionInput } from '../../core/types';

/**
 * Test function for data extraction workflow.
 * This function handles the EXTRACTION_DATA_START event and
 * demonstrates how to extract and normalize user data.
 * 
 * @param events Array of function input events
 * @returns A success message indicating the extraction was successful
 */
export async function data_extraction_check(events: FunctionInput[]): Promise<{ status: string, message: string }> {
  try {
    // Only process the first event as per requirements
    if (events.length === 0) {
      throw new Error('No events provided to the function');
    }

    const event = events[0];
    const requestId = event.execution_metadata?.request_id || 'unknown';
    console.log(`Data extraction check function invoked with request ID: ${requestId}`);

    // Convert to AirdropEvent format
    const airdropEvent = convertToAirdropEvent(event);

    // Check if the event type is correct
    if (airdropEvent.payload.event_type !== EventType.ExtractionDataStart && 
        airdropEvent.payload.event_type !== EventType.ExtractionDataContinue) {
      console.log(`Received event type: ${airdropEvent.payload.event_type}, expected: ${EventType.ExtractionDataStart} or ${EventType.ExtractionDataContinue}`);
      return {
        status: 'success',
        message: 'Function executed, but the event type was not EXTRACTION_DATA_START or EXTRACTION_DATA_CONTINUE'
      };
    }

    try {
      // Use require.resolve to find the worker file relative to this module
      const workerPath = require.resolve('./worker');
      
      // Initial state for the worker
      const initialState = {
        users: { completed: false }
      };
      
      // Create a worker to handle the event
      await spawn({
        event: airdropEvent,
        initialState: initialState,
        workerPath: workerPath,
      });
    } catch (error) {
      console.error('Error in data extraction process:', error);
      // Properly handle the unknown error type
      if (error instanceof Error) {
        throw new Error(`Failed to process data extraction: ${error.message}`);
      } else {
        throw new Error(`Failed to process data extraction: ${String(error)}`);
      }
    }

    return {
      status: 'success',
      message: 'Data extraction check completed successfully'
    };
  } catch (error) {
    // Log the error with detailed information for debugging
    console.error('Error in data_extraction_check function:', error);
    throw error;
  }
}