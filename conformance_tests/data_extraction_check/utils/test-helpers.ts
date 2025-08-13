import { EventType, asEventType } from './types';

export function createDataExtractionStartEvent(requestId: string = 'test-request-id', eventType: string = EventType.ExtractionDataStart) {
  const event = {
    context: {
      dev_oid: 'test-dev-oid',
      source_id: 'test-source-id',
      snap_in_id: 'test-snap-in-id',
      snap_in_version_id: 'test-snap-in-version-id',
      service_account_id: 'test-service-account-id',
      secrets: {
        service_account_token: 'test-service-account-token'
      }
    },
    payload: {
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'Test Organization',
        key: 'test-key',
        key_type: 'test-key-type'
      },
      event_context: {
        callback_url: 'http://localhost:8002/callback',
        dev_org: 'test-dev-org',
        dev_org_id: 'test-dev-org-id',
        dev_user: 'test-dev-user',
        dev_user_id: 'test-dev-user-id',
        external_sync_unit: 'test-external-sync-unit',
        external_sync_unit_id: 'test-external-sync-unit-id',
        external_sync_unit_name: 'Test External Sync Unit',
        external_system: 'test-external-system',
        external_system_type: 'test-external-system-type',
        import_slug: 'test-import-slug',
        mode: 'INITIAL',
        request_id: requestId,
        snap_in_slug: 'test-snap-in-slug',
        snap_in_version_id: 'test-snap-in-version-id',
        sync_run: 'test-sync-run',
        sync_run_id: 'test-sync-run-id',
        sync_tier: 'test-sync-tier',
        sync_unit: 'test-sync-unit',
        sync_unit_id: 'test-sync-unit-id',
        uuid: 'test-uuid',
        worker_data_url: 'http://localhost:8003/external-worker'
      },
      event_type: EventType.ExtractionDataStart, // Default value, will be overridden if needed
      event_data: {}
    },
    execution_metadata: {
      request_id: requestId,
      function_name: 'data_extraction_check',
      event_type: 'extraction_data_start',
      devrev_endpoint: 'http://localhost:8003'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };
  
  // Set the event type using the type guard function
  event.payload.event_type = asEventType(eventType);
  return event;
}