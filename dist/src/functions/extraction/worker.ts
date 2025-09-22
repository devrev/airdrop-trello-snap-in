import { processTask } from '@devrev/ts-adaas';
import { EventType } from '@devrev/ts-adaas';
import { ExtractorState } from './index';
import {
  handleMetadataExtraction,
  handleDataExtraction,
  handleAttachmentsExtraction,
  handleExternalSyncUnitsExtraction,
  handleTimeout
} from './event-handlers';

// Process the external sync units extraction task
processTask<ExtractorState>({
  task: async ({ adapter }) => {
    // Handle different event types
    const eventType = adapter.event.payload.event_type;
    
    if (eventType === 'EXTRACTION_METADATA_START') {
      await handleMetadataExtraction(adapter);
      return;
    }
    
    // Handle EXTRACTION_DATA_START and EXTRACTION_DATA_CONTINUE events
    if (eventType === EventType.ExtractionDataStart || eventType === EventType.ExtractionDataContinue) {
      await handleDataExtraction(adapter);
      return;
    }
    
    // Handle EXTRACTION_ATTACHMENTS_START and EXTRACTION_ATTACHMENTS_CONTINUE events
    if (eventType === 'EXTRACTION_ATTACHMENTS_START' || eventType === 'EXTRACTION_ATTACHMENTS_CONTINUE') {
      await handleAttachmentsExtraction(adapter);
      return;
    }
    
    // Handle EXTRACTION_EXTERNAL_SYNC_UNITS_START event (default case)
    await handleExternalSyncUnitsExtraction(adapter);
  },
  onTimeout: async ({ adapter }) => {
    await handleTimeout(adapter);
  },
});