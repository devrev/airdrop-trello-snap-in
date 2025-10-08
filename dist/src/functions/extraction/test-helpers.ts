import { EventType } from '@devrev/ts-adaas';
import { FunctionInput } from '../../core/types';

export const createMockEvent = (eventType: string, overrides: any = {}): FunctionInput => ({
  payload: {
    event_type: eventType,
    connection_data: {
      org_id: 'test-org-id',
      org_name: 'test-org-name',
      key: 'key=test-api-key&token=test-token',
      key_type: 'test-key-type'
    },
    event_context: {
      callback_url: 'test-callback-url',
      dev_org: 'test-dev-org',
      dev_org_id: 'test-dev-org-id',
      dev_user: 'test-dev-user',
      dev_user_id: 'test-dev-user-id',
      external_sync_unit: 'test-external-sync-unit',
      external_sync_unit_id: 'test-external-sync-unit-id',
      external_sync_unit_name: 'test-external-sync-unit-name',
      external_system: 'test-external-system',
      external_system_type: 'test-external-system-type',
      import_slug: 'test-import-slug',
      mode: 'INITIAL',
      request_id: 'test-request-id',
      snap_in_slug: 'test-snap-in-slug',
      snap_in_version_id: 'test-snap-in-version-id',
      sync_run: 'test-sync-run',
      sync_run_id: 'test-sync-run-id',
      sync_tier: 'test-sync-tier',
      sync_unit: 'test-sync-unit',
      sync_unit_id: 'test-sync-unit-id',
      uuid: 'test-uuid',
      worker_data_url: 'test-worker-data-url'
    },
    event_data: {},
    ...overrides.payload
  },
  context: {
    dev_oid: 'test-dev-oid',
    source_id: 'test-source-id',
    snap_in_id: 'test-snap-in-id',
    snap_in_version_id: 'test-snap-in-version-id',
    service_account_id: 'test-service-account-id',
    secrets: {
      service_account_token: 'test-token'
    },
    ...overrides.context
  },
  execution_metadata: {
    request_id: 'test-request-id',
    function_name: 'extraction',
    event_type: 'test-event-type',
    devrev_endpoint: 'https://api.devrev.ai',
    ...overrides.execution_metadata
  },
  input_data: {
    global_values: {},
    event_sources: {},
    ...overrides.input_data
  }
});

export const expectedSpawnConfig = {
  event: expect.any(Object),
  initialState: {
    users: { completed: false },
    cards: { completed: false },
    attachments: { completed: false }
  },
  workerPath: expect.stringContaining('/worker.ts'),
  initialDomainMapping: expect.any(Object),
  options: {
    timeout: 10 * 60 * 1000
  }
};

export const testEventTypes = {
  EXTERNAL_SYNC_UNITS_START: {
    eventType: EventType.ExtractionExternalSyncUnitsStart,
    message: 'External sync units extraction initiated successfully'
  },
  METADATA_START: {
    eventType: EventType.ExtractionMetadataStart,
    message: 'Metadata extraction initiated successfully'
  },
  DATA_START: {
    eventType: EventType.ExtractionDataStart,
    message: 'Data extraction initiated successfully'
  },
  DATA_CONTINUE: {
    eventType: EventType.ExtractionDataContinue,
    message: 'Data extraction initiated successfully'
  },
  ATTACHMENTS_START: {
    eventType: EventType.ExtractionAttachmentsStart,
    message: 'Attachments extraction initiated successfully'
  },
  ATTACHMENTS_CONTINUE: {
    eventType: EventType.ExtractionAttachmentsContinue,
    message: 'Attachments extraction initiated successfully'
  }
};

export const supportedEventTypes = [
  EventType.ExtractionExternalSyncUnitsStart,
  EventType.ExtractionMetadataStart,
  EventType.ExtractionDataStart,
  EventType.ExtractionDataContinue,
  EventType.ExtractionAttachmentsStart,
  EventType.ExtractionAttachmentsContinue
];