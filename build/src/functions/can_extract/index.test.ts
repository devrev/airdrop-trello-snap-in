import { handler } from './index';
import { AirdropEvent, EventType } from '@devrev/ts-adaas';

describe('can_extract function', () => {
  // Create a properly structured mock AirdropEvent
  const createMockEvent = (eventType: EventType = EventType.ExtractionMetadataStart): AirdropEvent => ({
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
    payload: createMockPayload(eventType) as any,
  });

  it('should return success when extraction can be invoked', async () => {
    const mockEvent = createMockEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      can_extract: true,
      message: 'Data extraction workflow can be invoked'
    });
  });

  it('should return false for non-extraction event types', async () => {
    // Create a mock event with a non-extraction event type
    const mockEvent = createMockEvent();
    mockEvent.payload.event_type = 'NOT_AN_EXTRACTION_EVENT' as any;

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      can_extract: false,
      message: 'Event type NOT_AN_EXTRACTION_EVENT is not an extraction event'
    });
  });

  it('should return false when service account token is missing', async () => {
    const mockEvent = createMockEvent();
    // Create a new context object without the service account token
    mockEvent.context = {
      ...mockEvent.context,
      secrets: {} as any
    };

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      can_extract: false,
      message: 'Missing service account token in event context'
    });
  });

  it('should return false when DevRev endpoint is missing', async () => {
    const mockEvent = createMockEvent();
    // Create a new execution_metadata object without the devrev_endpoint
    mockEvent.execution_metadata = {} as any;
    

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      can_extract: false,
      message: 'Missing DevRev endpoint in execution metadata'
    });
  });

  it('should return false when event context is missing', async () => {
    const mockEvent = createMockEvent();
    // Create a new payload object without the event_context property
    mockEvent.payload = {
      connection_data: mockEvent.payload.connection_data,
      event_type: mockEvent.payload.event_type,
      // Intentionally omitting event_context to test the missing context case
    } as any;


    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      can_extract: false,
      message: 'Missing event context in payload'
    });
  });

  it('should throw error when no events are provided', async () => {
    // Call the handler function with an empty array
    await expect(handler([])).rejects.toThrow('No events provided');
  });

  // Helper function to create a mock payload
  function createMockPayload(eventType: EventType = EventType.ExtractionMetadataStart) {
    return {
      connection_data: {
        org_id: 'mock-org-id',
        org_name: 'mock-org-name',
        key: 'mock-key',
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
        sync_run: 'mock-sync-run' as any,
        sync_run_id: 'mock-sync-run-id',
        sync_tier: 'mock-sync-tier',
        sync_unit: 'mock-sync-unit',
        sync_unit_id: 'mock-sync-unit-id',
      },
      event_type: eventType,
    };
  }
});