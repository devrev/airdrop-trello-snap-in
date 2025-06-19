import axios from 'axios';
import { AirdropEvent, EventType } from '@devrev/ts-adaas';
import { handler } from './index';

// Original axios get method
const originalAxiosGet = axios.get;

describe('check_auth function', () => {
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

  // Spy on axios get method
  let axiosGetSpy: jest.SpyInstance;

  beforeEach(() => {
    // Setup spy before each test
    axiosGetSpy = jest.spyOn(axios, 'get');
  });

  afterEach(() => {
    axiosGetSpy.mockRestore();
  });

  it('should return authenticated true when credentials are valid', async () => {
    // Mock successful API response
    (axios.get as jest.Mock).mockResolvedValueOnce({
      status: 200,
      data: [{ name: 'Test Board' }]
    });
    
    const mockEvent = createMockEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      authenticated: true,
      message: 'Successfully authenticated with Trello API'
    });

    // Verify axios was called with the correct parameters
    expect(axiosGetSpy).toHaveBeenCalledWith(
      'https://api.trello.com/1/members/me/boards',
      expect.objectContaining({
        params: {
          key: 'test-api-key',
          token: 'test-token',
          fields: 'name'
        },
        timeout: 10000
      })
    );
  });

  it('should return authenticated false when credentials are invalid', async () => {
    // Mock failed API response
    (axios.get as jest.Mock).mockRejectedValueOnce({
      response: {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Invalid token' }
      }
    });
    
    const mockEvent = createMockEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      authenticated: false,
      message: 'Authentication failed with status 401: Unauthorized',
      details: {
        status: 401,
        data: { message: 'Invalid token' }
      }
    });
  });

  it('should return authenticated false when no response is received', async () => {
    // Mock network error
    (axios.get as jest.Mock).mockRejectedValueOnce({
      request: {},
      message: 'Network Error'
    });
    
    const mockEvent = createMockEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      authenticated: false,
      message: 'Authentication failed: No response received from Trello API',
      details: {}
    });
  });

  it('should return authenticated false when connection data is missing', async () => {
    const mockEvent = createMockEvent();
    // Remove connection data from the payload
    mockEvent.payload.connection_data = undefined as any;

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      authenticated: false,
      message: 'Missing connection data in payload'
    });

    // Verify axios get was not called
    expect(axiosGetSpy).not.toHaveBeenCalled();
  });

  it('should return authenticated false when key is missing in connection data', async () => {
    const mockEvent = createMockEvent();
    // Create a new connection data object without the key property
    const { key, ...connectionDataWithoutKey } = mockEvent.payload.connection_data;
    
    // Replace the original connection data with the new one that doesn't have key
    mockEvent.payload.connection_data = ({
      ...connectionDataWithoutKey
    } as any);

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      authenticated: false,
      message: 'Missing key in connection data'
    });

    // Verify axios get was not called
    expect(axiosGetSpy).not.toHaveBeenCalled();
  });

  it('should return authenticated false when key format is invalid', async () => {
    const mockEvent = createMockEvent();
    // Set invalid key format
    mockEvent.payload.connection_data.key = 'invalid-format';

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      authenticated: false,
      message: 'Authentication failed: Failed to extract credentials: Invalid key format. Expected format: "key=<api_key>&token=<token>"',
      details: {}
    });

    // Verify axios get was not called
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('should throw error when no events are provided', async () => {
    // Call the handler function with an empty array
    await expect(handler([])).rejects.toThrow('No events provided');
    
    // Verify axios get was not called
    expect(axios.get).not.toHaveBeenCalled();
  });

  // Helper function to create a mock payload
  function createMockPayload() {
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
      event_type: EventType.ExtractionMetadataStart,
    };
  }
});