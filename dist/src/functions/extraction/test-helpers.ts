import { EventType } from '@devrev/ts-adaas';
import { FunctionInput } from '../../core/types';

/**
 * Base mock event template
 */
const baseMockEvent: FunctionInput = {
  payload: {
    event_type: EventType.ExtractionExternalSyncUnitsStart,
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
    event_data: {}
  },
  context: {
    dev_oid: 'test-dev-oid',
    source_id: 'test-source-id',
    snap_in_id: 'test-snap-in-id',
    snap_in_version_id: 'test-snap-in-version-id',
    service_account_id: 'test-service-account-id',
    secrets: {
      service_account_token: 'test-token'
    }
  },
  execution_metadata: {
    request_id: 'test-request-id',
    function_name: 'extraction',
    event_type: 'test-event-type',
    devrev_endpoint: 'https://api.devrev.ai'
  },
  input_data: {
    global_values: {},
    event_sources: {}
  }
};

/**
 * Creates a mock event with the specified event type
 */
export function createMockEvent(eventType: string): FunctionInput {
  return {
    ...baseMockEvent,
    payload: {
      ...baseMockEvent.payload,
      event_type: eventType
    }
  };
}

/**
 * Creates a mock event with custom overrides
 */
export function createMockEventWithOverrides(overrides: Partial<FunctionInput>): FunctionInput {
  const mergedEvent = { ...baseMockEvent };
  
  if (overrides.payload) {
    mergedEvent.payload = { ...baseMockEvent.payload, ...overrides.payload };
  }
  if (overrides.context) {
    mergedEvent.context = { ...baseMockEvent.context, ...overrides.context };
  }
  if (overrides.execution_metadata) {
    mergedEvent.execution_metadata = { ...baseMockEvent.execution_metadata, ...overrides.execution_metadata };
  }
  if (overrides.input_data) {
    mergedEvent.input_data = { ...baseMockEvent.input_data, ...overrides.input_data };
  }

  return mergedEvent;
}

/**
 * Expected spawn call parameters for testing
 */
export const expectedSpawnParams = {
  event: expect.anything(),
  initialState: expect.objectContaining({
    users: { completed: false },
    cards: { completed: false },
    attachments: { completed: false }
  }),
  workerPath: expect.stringContaining('/worker.ts'),
  initialDomainMapping: expect.anything(),
  options: expect.anything()
};

/**
 * Expected success result
 */
export const expectedSuccessResult = {
  success: true,
  message: 'Extraction process initiated successfully'
};

/**
 * Expected error result for no events
 */
export const expectedNoEventsError = {
  success: false,
  message: 'Extraction process failed: No events provided'
};