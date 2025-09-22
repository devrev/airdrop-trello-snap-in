import { spawn } from '@devrev/ts-adaas';
import { EventType } from '@devrev/ts-adaas';
import { FunctionInput } from '../../core/types';
import { convertToAirdropEvent } from '../../core/utils';
import initialDomainMapping from '../get_initial_domain_mapping/initial_domain_mapping.json';

/**
 * Type definition for the extraction state
 */
export type ExtractorState = {
  users: {
    completed: boolean;
  };
  cards: {
    completed: boolean;
    before?: string;
    modifiedSince?: string;
  };
  attachments: {
    completed: boolean;
  };
};

/**
 * Initial state for the extraction process
 */
const initialState: ExtractorState = {
  users: { completed: false },
  cards: { completed: false },
  attachments: { completed: false }
};

/**
 * Function that handles the extraction workflow.
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

    // Check if the event type is supported
    if (
      airdropEvent.payload.event_type !== EventType.ExtractionExternalSyncUnitsStart && 
      airdropEvent.payload.event_type !== EventType.ExtractionMetadataStart &&
      airdropEvent.payload.event_type !== EventType.ExtractionDataStart &&
      airdropEvent.payload.event_type !== EventType.ExtractionDataContinue &&
      airdropEvent.payload.event_type !== 'EXTRACTION_ATTACHMENTS_START' &&
      airdropEvent.payload.event_type !== 'EXTRACTION_ATTACHMENTS_CONTINUE'
    ) {
      return {
        success: false,
        message: `Unexpected event type: ${airdropEvent.payload.event_type}. Expected: ${EventType.ExtractionExternalSyncUnitsStart}, ${EventType.ExtractionMetadataStart}, ${EventType.ExtractionDataStart}, ${EventType.ExtractionDataContinue}, EXTRACTION_ATTACHMENTS_START, or EXTRACTION_ATTACHMENTS_CONTINUE`
      };
    }

    // Spawn a worker thread to handle the extraction
    await spawn({
      event: airdropEvent,
      initialState,
      workerPath: `${__dirname}/worker.ts`,
      initialDomainMapping,
      options: {
        timeout: 10 * 60 * 1000 // 10 minutes in milliseconds
      }
    });

    return {
      success: true,
      message: 'Extraction process initiated successfully'
    };
  } catch (error) {
    console.error('Error in extraction function:', error);
    return {
      success: false,
      message: `Extraction process failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}