import { AirdropEvent, EventType } from '@devrev/ts-adaas';

/**
 * Creates a mock payload for testing
 * 
 * @param eventType - The event type to use in the payload
 * @returns A mock payload object
 */
export function createMockPayload(eventType: EventType = EventType.ExtractionMetadataStart) {
  return {
    connection_data: {
      org_id: 'mock-org-id',
      org_name: 'mock-org-name',
      key: 'key=test-api-key&token=test-token',
      key_type: 'mock-key-type',
    },
    event_context: {
      callback_url: 'https://mock-callback-url',
      dev_org: 'mock-dev-org',
      dev_org_id: 'mock-dev-org-id',
      dev_user: 'mock-dev-user',
      dev_user_id: 'mock-dev-user-id',
      external_sync_unit: 'mock-external-sync-unit',
      external_sync_unit_id: 'mock-external-sync-unit-id',
      external_sync_unit_name: 'mock-external-sync-unit-name',
      external_system: 'mock-external-system',
      external_system_type: 'mock-external-system-type',
      import_slug: 'mock-import-slug',
      mode: 'INITIAL',
      request_id: 'mock-request-id',
      snap_in_slug: 'mock-snap-in-slug',
      snap_in_version_id: 'mock-snap-in-version-id',
      uuid: 'mock-uuid',
      worker_data_url: 'mock-worker-data-url',
    },
    event_type: eventType,
  };
}

/**
 * Creates a properly structured mock AirdropEvent for testing
 * 
 * @returns A mock AirdropEvent object
 */
export function createMockEvent(): AirdropEvent {
  return {
    context: {
      secrets: {
        service_account_token: 'mock-token',
      },
      snap_in_version_id: 'mock-version-id',
      snap_in_id: 'mock-snap-in-id',
    } as any,
    execution_metadata: {
      devrev_endpoint: 'https://mock-endpoint.devrev.ai'
    },
    input_data: {
      global_values: {},
      event_sources: {},
    },
    payload: createMockPayload() as any,
  };
}