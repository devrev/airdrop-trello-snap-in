import { spawn } from '@devrev/ts-adaas';
import { EventType, ExtractorEventType, ExternalSyncUnit } from '@devrev/ts-adaas';
import path from 'path';
import { convertToAirdropEvent } from '../../core/utils';
import { FunctionInput } from '../../core/types';

/**
 * Test function for external sync units extraction workflow.
 * This function handles the EXTRACTION_EXTERNAL_SYNC_UNITS_START event and
 * responds with sample external sync units.
 * 
 * @param events Array of function input events
 * @returns A success message indicating the extraction was successful
 */
export async function test_external_sync_units(events: FunctionInput[]): Promise<{ status: string, message: string }> {
  try {
    // Only process the first event as per requirements
    if (events.length === 0) {
      throw new Error('No events provided to the function');
    }

    const event = events[0];
    const requestId = event.execution_metadata?.request_id || 'unknown';
    console.log(`External sync units test function invoked with request ID: ${requestId}`);

    // Convert to AirdropEvent format
    const airdropEvent = convertToAirdropEvent(event);

    // Check if the event type is correct
    if (airdropEvent.payload.event_type !== EventType.ExtractionExternalSyncUnitsStart) {
      console.log(`Received event type: ${airdropEvent.payload.event_type}, expected: ${EventType.ExtractionExternalSyncUnitsStart}`);
      return {
        status: 'success',
        message: 'Function executed, but the event type was not EXTRACTION_EXTERNAL_SYNC_UNITS_START'
      };
    }

    try {
      // Use require.resolve to find the worker file relative to this module
      const workerPath = require.resolve('./worker');
      
      // Create a worker to handle the event
      await spawn({
        event: airdropEvent,
        initialState: {},
        workerPath: workerPath,
      });
    } catch (error) {
      console.error('Error resolving worker path:', error);
      // Properly handle the unknown error type
      if (error instanceof Error) {
        throw new Error(`Failed to resolve worker path: ${error.message}`);
      } else {
        throw new Error(`Failed to resolve worker path: ${String(error)}`);
      }
    }

    return {
      status: 'success',
      message: 'External sync units extraction test completed successfully'
    };
  } catch (error) {
    // Log the error with detailed information for debugging
    console.error('Error in test_external_sync_units function:', error);
    throw error;
  }
}