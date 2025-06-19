import { AirdropEvent, EventType, spawn } from '@devrev/ts-adaas';
import path from 'path';
import fs from 'fs';
import { resolveWorkerPath } from '../../core/worker-utils';
import { loadInitialDomainMapping } from '../../core/domain-mapping-utils';

/**
 * State interface for the data extraction process
 */
interface DataExtractionState {
  completed: boolean;
  error?: string;
}

/**
 * Function that tests the data extraction workflow.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns Object indicating if data extraction works
 */
export const handler = async (events: AirdropEvent[]): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    if (!events || events.length === 0) {
      throw new Error('No events provided');
    }

    const event = events[0];
    
    // Check if the event is related to data extraction
    if (event.payload.event_type !== EventType.ExtractionDataStart) {
      return {
        success: false,
        message: `Event type ${event.payload.event_type} is not a data extraction event`
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

    // Check if event context contains necessary data
    const eventContext = event.payload.event_context;
    if (!eventContext) {
      return {
        success: false,
        message: 'Missing event context in payload'
      };
    }

    // Initial state for the extraction process
    const initialState: DataExtractionState = {
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
          timeout: 5 * 60 * 1000, // 5 minutes timeout
          batchSize: 100 // Smaller batch size for testing
        },
        initialDomainMapping
      });

      return {
        success: true,
        message: 'Data extraction workflow completed successfully'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Error during data extraction: ${errorMessage}`,
        details: error
      };
    }
  } catch (error) {
    console.error('Error in data_extraction_check function:', error);
    throw error;
  }
};