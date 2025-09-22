import { 
  ExtractorEventType, 
  WorkerAdapter,
  SyncMode
} from '@devrev/ts-adaas';
import { EventType } from '@devrev/ts-adaas';
import { ExtractorState } from './index';
import { getAttachmentStream } from './attachment-handler';
import {
  initializeDataRepositories,
  initializeMetadataRepository,
  processMetadataExtraction,
  processUsersExtraction,
  processCardsExtraction,
  processExternalSyncUnitsExtraction
} from './data-fetcher';

/**
 * Handle metadata extraction
 */
export async function handleMetadataExtraction(adapter: WorkerAdapter<ExtractorState>): Promise<void> {
  try {
    // Initialize the external_domain_metadata repository
    initializeMetadataRepository(adapter);
    
    // Process metadata extraction
    await processMetadataExtraction(adapter);
    
    // Emit the EXTRACTION_METADATA_DONE event
    await adapter.emit(ExtractorEventType.ExtractionMetadataDone);
  } catch (error) {
    console.error('Error in metadata extraction worker:', error);
    
    // Emit an error event if something goes wrong
    await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
      error: {
        message: `Failed to extract metadata: ${error instanceof Error ? error.message : String(error)}`,
      },
    });
  }
}

/**
 * Handle data extraction (both start and continue)
 */
export async function handleDataExtraction(adapter: WorkerAdapter<ExtractorState>): Promise<void> {
  try {
    // Handle incremental mode for EXTRACTION_DATA_START
    if (adapter.event.payload.event_type === EventType.ExtractionDataStart) {
      if (adapter.event.payload.event_context.mode === SyncMode.INCREMENTAL) {
        // Reset cards state for incremental sync
        adapter.state.cards = { completed: false };
        adapter.state.attachments = { completed: false };
        adapter.state.cards.modifiedSince = adapter.state.lastSuccessfulSyncStarted;
      }
    }

    // Initialize repositories
    initializeDataRepositories(adapter);

    // Process users extraction
    await processUsersExtraction(adapter);

    // Process cards and attachments extraction
    await processCardsExtraction(adapter);

    // Emit the EXTRACTION_DATA_DONE event
    await adapter.emit(ExtractorEventType.ExtractionDataDone);
  } catch (error) {
    console.error('Error in data extraction worker:', error);
    
    // Check if this is a rate limiting error
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      // Extract delay from error message if available
      const delayMatch = error.message.match(/Retry after (\d+) seconds/);
      const delay = delayMatch ? parseInt(delayMatch[1], 10) : 30;
      
      await adapter.emit(ExtractorEventType.ExtractionDataDelay, {
        delay: delay,
      });
      return;
    }
    
    // Emit an error event for other errors
    await adapter.emit(ExtractorEventType.ExtractionDataError, {
      error: {
        message: `Failed to extract data: ${error instanceof Error ? error.message : String(error)}`,
      },
    });
  }
}

/**
 * Handle attachments extraction (both start and continue)
 */
export async function handleAttachmentsExtraction(adapter: WorkerAdapter<ExtractorState>): Promise<void> {
  try {
    const response = await adapter.streamAttachments({
      stream: getAttachmentStream,
    });

    // Handle different response scenarios
    if (response?.delay) {
      await adapter.emit(ExtractorEventType.ExtractionAttachmentsDelay, {
        delay: response.delay,
      });
    } else if (response?.error) {
      await adapter.emit(ExtractorEventType.ExtractionAttachmentsError, {
        error: response.error,
      });
    } else {
      await adapter.emit(ExtractorEventType.ExtractionAttachmentsDone);
    }
  } catch (error) {
    console.error('An error occurred while processing attachments extraction task.', error);
    
    // Emit an error event for attachment extraction errors
    await adapter.emit(ExtractorEventType.ExtractionAttachmentsError, {
      error: {
        message: `Failed to extract attachments: ${error instanceof Error ? error.message : String(error)}`,
      },
    });
  }
}

/**
 * Handle external sync units extraction
 */
export async function handleExternalSyncUnitsExtraction(adapter: WorkerAdapter<ExtractorState>): Promise<void> {
  try {
    // Process external sync units extraction
    const externalSyncUnits = await processExternalSyncUnitsExtraction(adapter);

    // Emit the EXTRACTION_EXTERNAL_SYNC_UNITS_DONE event with the external sync units
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
      external_sync_units: externalSyncUnits,
    });
  } catch (error) {
    console.error('Error in external sync units extraction worker:', error);
    
    // Emit an error event if something goes wrong
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: `Failed to extract external sync units: ${error instanceof Error ? error.message : String(error)}`,
      },
    });
  }
}

/**
 * Handle timeout scenarios for different event types
 */
export async function handleTimeout(adapter: WorkerAdapter<ExtractorState>): Promise<void> {
  const eventType = adapter.event.payload.event_type;
  
  if (eventType === EventType.ExtractionDataStart || eventType === EventType.ExtractionDataContinue) {
    await adapter.emit(ExtractorEventType.ExtractionDataProgress);
    return;
  }
  
  if (eventType === 'EXTRACTION_ATTACHMENTS_START' || eventType === 'EXTRACTION_ATTACHMENTS_CONTINUE') {
    await adapter.emit(ExtractorEventType.ExtractionAttachmentsProgress, {
      progress: 50,
    });
    await adapter.emit(ExtractorEventType.ExtractionDataProgress);
    return;
  }
  
  if (eventType === 'EXTRACTION_METADATA_START') {
    await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
      error: {
        message: 'Failed to extract metadata. Lambda timeout.',
      },
    });
  } else {
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: 'Failed to extract external sync units. Lambda timeout.',
      },
    });
  }
}