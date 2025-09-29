import { processTask, ExtractorEventType, EventType, NormalizedItem, NormalizedAttachment, SyncMode } from '@devrev/ts-adaas';
import { ExtractorState } from './types';
import { handleExternalSyncUnitsExtraction, handleMetadataExtraction, handleDataExtraction, handleAttachmentsExtraction } from './extractors';

// Normalization function for users
function normalizeUser(user: any): NormalizedItem {
  return {
    id: user.id,
    created_date: convertTrelloIdToDate(user.id),
    modified_date: user.lastActive || convertTrelloIdToDate(user.id),
    data: {
      full_name: user.fullName || null,
      username: user.username || null,
    },
  };
}

// Normalization function for cards
function normalizeCard(card: any): NormalizedItem {
  return {
    id: card.id,
    created_date: convertTrelloIdToDate(card.id),
    modified_date: card.dateLastActivity || convertTrelloIdToDate(card.id),
    data: {
      name: card.name || null,
      url: card.url || null,
      description: convertToRichText(card.desc || ''),
      id_members: card.idMembers || [],
    },
  };
}

// Normalization function for attachments
function normalizeAttachment(attachment: any): NormalizedAttachment {
  let url = attachment.url;
  
  // Special URL handling for Trello URLs
  if (url && url.startsWith('https://trello.com')) {
    const fileName = attachment.fileName || attachment.name;
    url = `https://api.trello.com/1/cards/${attachment.parent_id}/attachments/${attachment.id}/download/${fileName}`;
  }

  return {
    id: attachment.id,
    url: url || null,
    file_name: attachment.fileName || attachment.name || null,
    parent_id: attachment.parent_id || null,
    author_id: attachment.idMember || null,
  };
}

// Convert Trello ID to ISO 8601 date
function convertTrelloIdToDate(trelloId: string): string {
  const hexTimestamp = trelloId.substring(0, 8);
  const timestamp = parseInt(hexTimestamp, 16);
  return new Date(timestamp * 1000).toISOString();
}

// Convert string to rich text format
function convertToRichText(text: string): string[] {
  if (!text || text.trim() === '') {
    return [];
  }
  return text.split('\n').filter(line => line.trim() !== '');
}

// Process the extraction task
processTask<ExtractorState>({
  task: async ({ adapter }) => {
    try {
      const eventType = adapter.event.payload.event_type;

      if (eventType === EventType.ExtractionExternalSyncUnitsStart) {
        await handleExternalSyncUnitsExtraction(adapter);
      } else if (eventType === EventType.ExtractionMetadataStart) {
        await handleMetadataExtraction(adapter);
      } else if (eventType === EventType.ExtractionDataStart || eventType === EventType.ExtractionDataContinue) {
        // Handle incremental mode for EXTRACTION_DATA_START
        if (eventType === EventType.ExtractionDataStart && 
            adapter.event.payload.event_context.mode === SyncMode.INCREMENTAL) {
          // Reset cards and attachments state for incremental sync
          adapter.state.cards = { completed: false, modifiedSince: adapter.state.lastSuccessfulSyncStarted };
          adapter.state.attachments = { completed: false };
        }
        
        await handleDataExtraction(adapter, normalizeUser, normalizeCard, normalizeAttachment);
      } else if (eventType === EventType.ExtractionAttachmentsStart || eventType === EventType.ExtractionAttachmentsContinue) {
        const getAttachmentStream = await handleAttachmentsExtraction(adapter);
        
        const response = await adapter.streamAttachments({
          stream: getAttachmentStream,
        });

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
      } else {
        throw new Error(`Unsupported event type: ${eventType}`);
      }
    } catch (error) {
      console.error('Error in extraction worker:', error);
      
      // Emit appropriate error event based on the event type
      const eventType = adapter.event.payload.event_type;
      if (eventType === EventType.ExtractionExternalSyncUnitsStart) {
        await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
          error: {
            message: `Failed to extract external sync units: ${error instanceof Error ? error.message : String(error)}`,
          },
        });
      } else if (eventType === EventType.ExtractionMetadataStart) {
        await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
          error: {
            message: `Failed to extract metadata: ${error instanceof Error ? error.message : String(error)}`,
          },
        });
      } else if (eventType === EventType.ExtractionDataStart || eventType === EventType.ExtractionDataContinue) {
        await adapter.emit(ExtractorEventType.ExtractionDataError, {
          error: {
            message: `Failed to extract data: ${error instanceof Error ? error.message : String(error)}`,
          },
        });
      } else if (eventType === EventType.ExtractionAttachmentsStart || eventType === EventType.ExtractionAttachmentsContinue) {
        await adapter.emit(ExtractorEventType.ExtractionAttachmentsError, {
          error: {
            message: `Failed to extract attachments: ${error instanceof Error ? error.message : String(error)}`,
          },
        });
      }
    }
  },
  onTimeout: async ({ adapter }) => {
    // Handle timeout by emitting appropriate error event
    const eventType = adapter.event.payload.event_type;
    if (eventType === EventType.ExtractionExternalSyncUnitsStart) {
      await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
        error: {
          message: 'Failed to extract external sync units. Lambda timeout.',
        },
      });
    } else if (eventType === EventType.ExtractionMetadataStart) {
      await adapter.emit(ExtractorEventType.ExtractionMetadataError, {
        error: {
          message: 'Failed to extract metadata. Lambda timeout.',
        },
      });
    } else if (eventType === EventType.ExtractionDataStart || eventType === EventType.ExtractionDataContinue) {
      await adapter.emit(ExtractorEventType.ExtractionDataProgress);
    } else if (eventType === EventType.ExtractionAttachmentsStart || eventType === EventType.ExtractionAttachmentsContinue) {
      await adapter.emit(ExtractorEventType.ExtractionAttachmentsProgress, { progress: 50 });
    }
  },
});