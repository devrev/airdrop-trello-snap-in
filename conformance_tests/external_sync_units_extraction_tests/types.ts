// Types for the conformance tests

export enum EventType {
  ExtractionExternalSyncUnitsStart = 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
}

export enum ExtractorEventType {
  ExtractionExternalSyncUnitsDone = 'EXTRACTION_EXTERNAL_SYNC_UNITS_DONE',
  ExtractionExternalSyncUnitsError = 'EXTRACTION_EXTERNAL_SYNC_UNITS_ERROR',
}

export interface ExternalSyncUnit {
  id: string;
  name: string;
  description: string;
  item_count?: number;
}

export interface Context {
  dev_oid: string;
  source_id: string;
  snap_in_id: string;
  snap_in_version_id: string;
  service_account_id: string;
  secrets: Record<string, string>;
}

export interface ExecutionMetadata {
  request_id: string;
  function_name: string;
  event_type: string;
  devrev_endpoint: string;
}

export interface InputData {
  global_values: Record<string, string>;
  event_sources: Record<string, string>;
}

export interface FunctionInput {
  payload: Record<string, any>;
  context: Context;
  execution_metadata: ExecutionMetadata;
  input_data: InputData;
}

export interface CallbackData {
  external_sync_units?: ExternalSyncUnit[];
  error?: {
    message: string;
  };
}

export interface CallbackEvent {
  event_type: ExtractorEventType;
  event_data: CallbackData;
}