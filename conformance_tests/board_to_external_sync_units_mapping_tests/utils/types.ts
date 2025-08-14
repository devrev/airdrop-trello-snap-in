export enum EventType {
  ExtractionExternalSyncUnitsStart = 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
  ExtractionMetadataStart = 'EXTRACTION_METADATA_START',
  ExtractionDataStart = 'EXTRACTION_DATA_START',
  ExtractionDataContinue = 'EXTRACTION_DATA_CONTINUE',
  ExtractionDataDelete = 'EXTRACTION_DATA_DELETE',
  ExtractionAttachmentsStart = 'EXTRACTION_ATTACHMENTS_START',
  ExtractionAttachmentsContinue = 'EXTRACTION_ATTACHMENTS_CONTINUE',
  ExtractionAttachmentsDelete = 'EXTRACTION_ATTACHMENTS_DELETE'
}

export enum ExtractorEventType {
  ExtractionExternalSyncUnitsDone = 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE',
  ExtractionExternalSyncUnitsError = 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR',
  ExtractionMetadataDone = 'EXTRACTION_METADATA_DONE',
  ExtractionMetadataError = 'EXTRACTION_METADATA_ERROR',
  ExtractionDataProgress = 'EXTRACTION_DATA_PROGRESS',
  ExtractionDataDelay = 'EXTRACTION_DATA_DELAY',
  ExtractionDataDone = 'EXTRACTION_DATA_DONE',
  ExtractionDataError = 'EXTRACTION_DATA_ERROR',
  ExtractionDataDeleteDone = 'EXTRACTION_DATA_DELETE_DONE',
  ExtractionDataDeleteError = 'EXTRACTION_DATA_DELETE_ERROR',
  ExtractionAttachmentsProgress = 'EXTRACTION_ATTACHMENTS_PROGRESS',
  ExtractionAttachmentsDelay = 'EXTRACTION_ATTACHMENTS_DELAY',
  ExtractionAttachmentsDone = 'EXTRACTION_ATTACHMENTS_DONE',
  ExtractionAttachmentsError = 'EXTRACTION_ATTACHMENTS_ERROR',
  ExtractionAttachmentsDeleteDone = 'EXTRACTION_ATTACHMENTS_DELETE_DONE',
  ExtractionAttachmentsDeleteError = 'EXTRACTION_ATTACHMENTS_DELETE_ERROR',
  UnknownEventType = 'UNKNOWN_EVENT_TYPE',
}

export interface ExternalSyncUnit {
  id: string;
  name: string;
  description: string;
  item_type: string;
  item_count?: number;
}

// This ensures TypeScript properly validates the structure
export type ExternalSyncUnits = ExternalSyncUnit[];