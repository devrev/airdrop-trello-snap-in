import { AirdropEvent, EventType, ExtractorEventType, spawn } from '@devrev/ts-adaas';
import { handler as pushBoardsAsSyncUnits } from '../push_boards_as_sync_units';
import { handler as extractionMetadata } from '../extraction_metadata';
import { handler as extractionAttachments } from '../extraction_attachments';
import path from 'path';
import fs from 'fs';
import { resolveWorkerPath } from '../../core/worker-utils';
import { loadInitialDomainMapping } from '../../core/domain-mapping-utils';

/**
 * Function that routes extraction events to the appropriate extraction functions
 * based on the event type.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns Object indicating if the extraction was successful
 */
export const handler = async (events: AirdropEvent[]): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    // Check if events array is empty
    if (!events || events.length === 0) {
      const error = new Error('No events provided');
      return {
        success: false,
        message: `Error in extraction function: ${error.message}`,
        details: error
      };
    }

    const event = events[0];
    const eventType = event.payload?.event_type;

    // Route to the appropriate extraction function based on event type
    switch (eventType) {
      case EventType.ExtractionExternalSyncUnitsStart:
        // Call the Push Boards Function
        return await pushBoardsAsSyncUnits([event]);

      case EventType.ExtractionMetadataStart:
        // Call the Push Metadata Function
        return await extractionMetadata([event]);

      case EventType.ExtractionDataStart:
        // Use a combined worker for data extraction to ensure only one EXTRACTION_DATA_DONE event is emitted
        try {
          // Initial state for the extraction process
          const initialState = {
            users: { completed: false },
            error: null,
            cards: { completed: false }
          };

          // Resolve the worker path using the utility function
          const workerPath = resolveWorkerPath(__dirname, 'worker');
          
          // Load the initial domain mapping
          const initialDomainMapping = loadInitialDomainMapping();
          
          // Check if the worker file exists
          if (!fs.existsSync(workerPath)) {
            return {
              success: false,
              message: `Worker file not found at path: ${workerPath}`
            };
          }
          
          // Spawn a worker to handle the extraction
          await spawn({
            event,
            initialState,
            workerPath,
            options: { 
              timeout: 10 * 60 * 1000, // 10 minutes timeout
              isLocalDevelopment: process.env.NODE_ENV === 'development', 
              batchSize: 100 // Smaller batch size for testing
            },
            initialDomainMapping
          });
          
          return { success: true, message: 'Data extraction completed successfully' };
        } catch (error) {
          console.error('Error during data extraction:', error);
          return { 
            success: false, 
            message: `Error during data extraction: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            details: error 
          };
        }

      case EventType.ExtractionAttachmentsStart:
      case EventType.ExtractionAttachmentsContinue:
        // Call the Attachment Extraction Function
        return await extractionAttachments([event]);

      default:
        return {
          success: false, 
          message: `Unsupported event type: ${eventType}`
        };
    }
  } catch (error) {
    console.error('Error in extraction function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      message: `Error in extraction function: ${errorMessage}`,
      details: error
    };
  }
};