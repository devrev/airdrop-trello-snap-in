import { EventType } from '@devrev/ts-adaas';
import { run } from './index';
import { FunctionInput } from '../../core/types';
import { spawn } from '@devrev/ts-adaas';

// Mock the spawn function
jest.mock('@devrev/ts-adaas', () => ({
  ...jest.requireActual('@devrev/ts-adaas'),
  spawn: jest.fn().mockResolvedValue(undefined),
  EventType: {
    ExtractionExternalSyncUnitsStart: 'EXTRACTION_EXTERNAL_SYNC_UNITS_START',
  }
}));

describe('test_external_sync_units function', () => {
  const mockEvent: FunctionInput = {
    payload: {
      event_type: EventType.ExtractionExternalSyncUnitsStart,
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'test-org-name',
        key: 'test-key',
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
      function_name: 'test_external_sync_units',
      event_type: 'test-event-type',
      devrev_endpoint: 'https://api.devrev.ai'
    },
    input_data: {
      global_values: {},
      event_sources: {}
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should spawn a worker when given a valid EXTRACTION_EXTERNAL_SYNC_UNITS_START event', async () => {
    const result = await run([mockEvent]);
    
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: true,
      message: 'External sync units extraction test initiated successfully'
    });
  });

  it('should return an error when no events are provided', async () => {
    const result = await run([]);
    
    expect(spawn).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: 'External sync units extraction test failed: No events provided'
    });
  });

  it('should handle undefined events array', async () => {
    // @ts-ignore - Testing invalid input
    const result = await run(undefined);
    
    expect(spawn).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: 'External sync units extraction test failed: No events provided'
    });
  });

  it('should return an error for unexpected event type', async () => {
    const invalidEvent = {
      ...mockEvent,
      payload: {
        ...mockEvent.payload,
        event_type: 'SOME_OTHER_EVENT_TYPE'
      }
    };
    
    const result = await run([invalidEvent]);
    
    expect(spawn).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      message: 'Unexpected event type: SOME_OTHER_EVENT_TYPE. Expected: EXTRACTION_EXTERNAL_SYNC_UNITS_START'
    });
  });
});