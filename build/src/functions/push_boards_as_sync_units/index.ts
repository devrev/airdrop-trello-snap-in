import { AirdropEvent, EventType, spawn } from '@devrev/ts-adaas';
import path from 'path';
import fs from 'fs';
import { resolveWorkerPath } from '../../core/worker-utils';
import { loadInitialDomainMapping } from '../../core/domain-mapping-utils';

/**
 * State interface for the boards sync units extraction
 */
interface BoardsSyncState {
  completed: boolean;
  error?: string;
}

/**
 * Function that pushes fetched boards as external sync units.
 * 
 * @param events - Array of AirdropEvent objects
 * @returns Object indicating if pushing boards as sync units was successful
 */
export const handler = async (events: AirdropEvent[]): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    if (!events || events.length === 0) {
      throw new Error('No events provided');
    }

    const event = events[0];
    
    // Check if the event is related to external sync units extraction
    if (event.payload.event_type !== EventType.ExtractionExternalSyncUnitsStart) {
      return {
        success: false,
        message: `Event type ${event.payload.event_type} is not an external sync units extraction event`
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
    const initialState: BoardsSyncState = {
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
        message: 'Successfully pushed boards as external sync units'
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Error pushing boards as external sync units: ${errorMessage}`,
        details: error
      };
    }
  } catch (error) {
    console.error('Error in push_boards_as_sync_units function:', error);
    throw error;
  }
};