import { AirdropEvent, EventType } from '@devrev/ts-adaas';

/**
 * Function that checks if data extraction workflow can be invoked.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns Object indicating if extraction can be invoked
 */
export const handler = async (events: AirdropEvent[]): Promise<{ can_extract: boolean; message: string }> => {
  try {
    if (!events || events.length === 0) {
      throw new Error('No events provided');
    }

    const event = events[0];
    
    // Check if the event is related to extraction
    const isExtractionEvent = [
      EventType.ExtractionExternalSyncUnitsStart,
      EventType.ExtractionMetadataStart,
      EventType.ExtractionDataStart,
      EventType.ExtractionDataContinue,
      EventType.ExtractionDataDelete,
      EventType.ExtractionAttachmentsStart,
      EventType.ExtractionAttachmentsContinue,
      EventType.ExtractionAttachmentsDelete
    ].includes(event.payload.event_type);

    if (!isExtractionEvent) {
      return {
        can_extract: false,
        message: `Event type ${event.payload.event_type} is not an extraction event`
      };
    }

    // Check if necessary context is available
    if (!event.context?.secrets?.service_account_token) {
      return {
        can_extract: false,
        message: 'Missing service account token in event context'
      };
    }

    if (!event.execution_metadata?.devrev_endpoint) {
      return {
        can_extract: false,
        message: 'Missing DevRev endpoint in execution metadata'
      };
    }

    // Check if event context contains necessary data
    const eventContext = event.payload.event_context;
    if (!eventContext) {
      return {
        can_extract: false,
        message: 'Missing event context in payload'
      };
    }

    // All checks passed
    return {
      can_extract: true,
      message: 'Data extraction workflow can be invoked'
    };
  } catch (error) {
    console.error('Error in can_extract function:', error);
    throw error;
  }
};