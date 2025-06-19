import axios from 'axios';
import { AirdropEvent, EventType } from '@devrev/ts-adaas';
import { handler } from './index';

// Original axios post method
const originalAxiosPost = axios.post;

describe('can_push_data function', () => {
  // Spy on axios post method
  let axiosPostSpy: jest.SpyInstance;
  
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

  beforeEach(() => {
    // Setup spy before each test
    axiosPostSpy = jest.spyOn(axios, 'post');
  });

  afterEach(() => {
    // Restore original implementation after each test
    axiosPostSpy.mockRestore();
  });

  it('should return success when pushing data works', async () => {
    // Mock successful axios response
    axiosPostSpy.mockResolvedValueOnce({
      status: 200,
      data: { success: true },
    });

    const mockEvent = createMockEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      can_push: true,
      message: 'Successfully pushed data to callback URL. Status: 200'
    });

    // Verify axios was called with the correct parameters
    expect(axiosPostSpy).toHaveBeenCalledWith(
      'https://mock-callback-url',
      expect.objectContaining({
        test_data: 'This is a test payload',
        timestamp: expect.any(String)
      }),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'mock-token'
        },
        timeout: 10000
      })
    );
  });

  it('should return false when pushing data fails with error status', async () => {
    // Mock failed axios response
    axiosPostSpy.mockResolvedValueOnce({
      status: 400,
      data: { error: 'Bad request' },
    });

    const mockEvent = createMockEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      can_push: false,
      message: 'Failed to push data to callback URL. Status: 400'
    });
  });

  it('should return false when axios throws an error', async () => {
    // Mock axios throwing an error
    axiosPostSpy.mockRejectedValueOnce(new Error('Network error'));

    const mockEvent = createMockEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      can_push: false,
      message: 'Error pushing data to callback URL: Network error'
    });
  });

  it('should return false when callback URL is missing', async () => {
    const mockEvent = createMockEvent();
    
    // Create a new event context object without the callback_url property
    const { callback_url, ...eventContextWithoutCallbackUrl } = mockEvent.payload.event_context;
    
    // Replace the original event context with the new one that doesn't have callback_url
    mockEvent.payload.event_context = {
      ...eventContextWithoutCallbackUrl,
      // callback_url is intentionally omitted to test the missing URL case
    } as any;
    
    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      can_push: false,
      message: 'Missing callback URL in event context'
    });

    // Verify axios post was not called
    expect(axiosPostSpy).not.toHaveBeenCalled();
  });

  it('should return false when event context is missing', async () => {
    const mockEvent = createMockEvent();
    // Remove the event context from the payload
    mockEvent.payload.event_context = undefined as any;

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      can_push: false,
      message: 'Missing event context in payload'
    });

    // Verify axios post was not called
    expect(axiosPostSpy).not.toHaveBeenCalled();
  });

  it('should throw error when no events are provided', async () => {
    // Call the handler function with an empty array
    await expect(handler([])).rejects.toThrow('No events provided');

    // Verify axios was not called
    expect(axiosPostSpy).not.toHaveBeenCalled();
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