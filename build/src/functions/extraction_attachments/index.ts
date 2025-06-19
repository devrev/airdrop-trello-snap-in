import { AirdropEvent, EventType, spawn } from '@devrev/ts-adaas';
import path from 'path';
import fs from 'fs';
import { resolveWorkerPath } from '../../core/worker-utils';
import { loadInitialDomainMapping } from '../../core/domain-mapping-utils';

/**
 * State interface for the attachments extraction process
 */
interface AttachmentsExtractionState {
  completed: boolean;
  error?: string;
}

/**
 * Function that handles the extraction of attachments from Trello cards.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns Object indicating if attachments extraction was successful
 */
export const handler = async (events: AirdropEvent[]): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    if (!events || events.length === 0) {
      throw new Error('No events provided');
    }

    const event = events[0];
    
    // Check if the event is related to attachments extraction
    if (event.payload.event_type !== EventType.ExtractionAttachmentsStart && 
        event.payload.event_type !== EventType.ExtractionAttachmentsContinue) {
      return {
        success: false,
        message: `Event type ${event.payload.event_type} is not an attachments extraction event`
      };
    }

    // Check if necessary context is available
    if (!event.context?.secrets?.service_account_token) {
      return {
        success: false,
        message: 'Missing service account token in event context'
      };
    }

    if (!event.execution_metadata?.devrev_endpoint) {
      return {
        success: false,
        message: 'Missing DevRev endpoint in execution metadata'
      };
    }

    // Check if connection data is available
    const connectionData = event.payload.connection_data;
    if (!connectionData) {
      return {
        success: false,
        message: 'Missing connection data in payload'
      };
    }

    // Check if key is available in connection data
    const keyString = connectionData.key;
    if (!keyString) {
      return {
        success: false,
        message: 'Missing key in connection data'
      };
    }

    // Check if event context contains necessary data
    const eventContext = event.payload.event_context;
    if (!eventContext) {
      return {
        success: false,
        message: 'Missing event context in payload'
      };
    }

    // Initial state for the extraction process
    const initialState: AttachmentsExtractionState = {
      completed: false
    };

    try {
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
          isLocalDevelopment: process.env.NODE_ENV === 'development',
          timeout: 10 * 60 * 1000, // 10 minutes timeout
          batchSize: 50 // Smaller batch size for attachments
        },
        initialDomainMapping
      });

      return {
        success: true,
        message: 'Attachments extraction completed successfully'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Error during attachments extraction: ${errorMessage}`,
        details: error
      };
    }
  } catch (error) {
    console.error('Error in extraction_attachments function:', error);
    throw error;
  }
};