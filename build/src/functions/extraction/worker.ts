import { processTask, ExtractorEventType, EventType } from '@devrev/ts-adaas';
import { 
  handleMetadataExtraction, 
  handleDataExtraction, 
  handleExternalSyncUnitsExtraction,
  handleAttachmentsExtraction, // This import still works due to re-export
  ExtractorState,
} from './extraction-handlers';

// Process the extraction tasks
processTask<ExtractorState>({
  task: async ({ adapter }) => {
    // Check if this is a metadata extraction event
    if (adapter.event.payload.event_type === EventType.ExtractionMetadataStart) {
      await handleMetadataExtraction(adapter);
      return;
    }

    // Check if this is a data extraction event
    if (adapter.event.payload.event_type === EventType.ExtractionDataStart || 
        adapter.event.payload.event_type === EventType.ExtractionDataContinue) {
      await handleDataExtraction(adapter);
      return;
    }

    // Check if this is an attachments extraction event
    if (adapter.event.payload.event_type === EventType.ExtractionAttachmentsStart || 
        adapter.event.payload.event_type === EventType.ExtractionAttachmentsContinue) {
      await handleAttachmentsExtraction(adapter);
      return;
    }
    
    // If not metadata or data extraction, assume it's external sync units extraction
    await handleExternalSyncUnitsExtraction(adapter);
  },
  onTimeout: async ({ adapter }) => {
    // Handle timeout based on the event type
    if (adapter.event.payload.event_type === EventType.ExtractionDataStart || 
        adapter.event.payload.event_type === EventType.ExtractionDataContinue) {
      // Emit progress event for data extraction timeout
      await adapter.emit(ExtractorEventType.ExtractionDataProgress);
      console.log('Data extraction task timed out, emitting progress event');
    } else if (adapter.event.payload.event_type === EventType.ExtractionAttachmentsStart || 
               adapter.event.payload.event_type === EventType.ExtractionAttachmentsContinue) {
      // Emit progress event for attachments extraction timeout
      await adapter.postState();
      await adapter.emit(ExtractorEventType.ExtractionAttachmentsProgress, {
        progress: 50,
      });
    } else if (adapter.event.payload.event_type === EventType.ExtractionExternalSyncUnitsStart) {
      // Emit error event for external sync units extraction timeout
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: 'Failed to extract external sync units. Lambda timeout.',
        },
      });
      console.error('External sync units extraction task timed out');
    } else if (adapter.event.payload.event_type === EventType.ExtractionMetadataStart) {
      // Emit error event for metadata extraction timeout
      await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
        error: {
          message: 'Failed to extract metadata. Lambda timeout.',
        },
      });
      console.error('Metadata extraction task timed out');
    }
  },
});