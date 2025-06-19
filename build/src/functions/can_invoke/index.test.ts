import { handler } from './index';
import { AirdropEvent, EventType } from '@devrev/ts-adaas';

describe('can_invoke function', () => {
  // Create a properly structured mock AirdropEvent
  const createMockEvent = (): AirdropEvent => ({
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
  });

  it('should return success response when invoked', async () => {
    const mockEvent = createMockEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: true,
      message: 'Function can be invoked successfully',
    });
  });

  it('should propagate errors if they occur', async () => {
    // Mock console.error to prevent test output pollution
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Create a mock implementation that throws an error
    const mockImplementation = jest.fn().mockImplementation(() => {
      throw new Error('Test error');
    });
    
    // Replace the console.log with our mock that throws an error
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(mockImplementation);
    
    const mockEvent = createMockEvent();

    // Call the handler function and expect it to throw
    await expect(handler([mockEvent])).rejects.toThrow('Test error');
    
    // Verify console.error was called
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error in can_invoke function:', expect.any(Error));
    
    // Restore the original implementations
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // Helper function to create a mock payload
  function createMockPayload() {
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
      event_type: EventType.ExtractionMetadataStart,
    };
  }
});