import { spawn } from '@devrev/ts-adaas';
import { EventType } from '@devrev/ts-adaas';
import { FunctionInput } from '../../core/types';
import { convertToAirdropEvent } from '../../core/utils';
import { ExtractorState } from './types';
import initialDomainMapping from '../../initial-domain-mapping.json';

/**
 * The Extraction Function that handles data extraction from Trello API.
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
    const supportedEventTypes = [
      EventType.ExtractionExternalSyncUnitsStart,
      EventType.ExtractionMetadataStart,
      EventType.ExtractionDataStart,
      EventType.ExtractionDataContinue,
      EventType.ExtractionAttachmentsStart,
      EventType.ExtractionAttachmentsContinue
    ];

    if (!supportedEventTypes.includes(airdropEvent.payload.event_type as EventType)) {
      return {
        success: false,
        message: `Unexpected event type: ${airdropEvent.payload.event_type}. Expected: ${supportedEventTypes.join(' or ')}`
      };
    }

    // Define initial state
    const initialState: ExtractorState = {
      users: { completed: false },
      cards: { completed: false },
      attachments: { completed: false }
    };

    // Spawn a worker thread to handle the extraction
    await spawn<ExtractorState>({
      event: airdropEvent,
      initialState,
      workerPath: `${__dirname}/worker.ts`,
      initialDomainMapping,
      options: {
        timeout: 10 * 60 * 1000, // 10 minutes
      }
    });

    // Determine success message based on event type
    let successMessage: string;
    if (airdropEvent.payload.event_type === EventType.ExtractionExternalSyncUnitsStart) {
      successMessage = 'External sync units extraction initiated successfully';
    } else if (airdropEvent.payload.event_type === EventType.ExtractionMetadataStart) {
      successMessage = 'Metadata extraction initiated successfully';
    } else if (airdropEvent.payload.event_type === EventType.ExtractionDataStart || 
               airdropEvent.payload.event_type === EventType.ExtractionDataContinue) {
      successMessage = 'Data extraction initiated successfully';
    } else if (airdropEvent.payload.event_type === EventType.ExtractionAttachmentsStart || 
               airdropEvent.payload.event_type === EventType.ExtractionAttachmentsContinue) {
      successMessage = 'Attachments extraction initiated successfully';
    } else {
      successMessage = 'Extraction initiated successfully';
    }

    return {
      success: true,
      message: successMessage
    };
  } catch (error) {
    console.error('Error in extraction function:', error);
    return {
      success: false,
      message: `Extraction failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}