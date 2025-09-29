import { run } from './index';
import { FunctionInput } from '../../core/types';
import { TrelloClient } from '../../core/trello-client';

// Mock the TrelloClient
jest.mock('../../core/trello-client');

describe('check_authentication function', () => {
  const mockEvent: FunctionInput = {
    payload: {
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'test-org-name',
        key: 'key=test-api-key&token=test-token',
        key_type: 'test-key-type'
      }
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
      function_name: 'check_authentication',
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

  it('should return authenticated true when API call succeeds', async () => {
    // Mock the static parseCredentials method
    const parseCredentialsSpy = jest.spyOn(TrelloClient, 'parseCredentials').mockReturnValue({
      apiKey: 'test-api-key',
      token: 'test-token',
    });

    const mockGetCurrentMember = jest.fn().mockResolvedValue({
      data: { id: 'user123', username: 'testuser' },
      status_code: 200,
      api_delay: 0,
      message: 'Successfully authenticated with Trello API',
    });

    // Mock the constructor
    (TrelloClient as jest.MockedClass<typeof TrelloClient>).mockImplementation(() => ({
      getCurrentMember: mockGetCurrentMember,
    } as any));

    const result = await run([mockEvent]);

    expect(result).toEqual({
      authenticated: true,
      status_code: 200,
      api_delay: 0,
      message: 'Successfully authenticated with Trello API',
    });
  });

  it('should return authenticated false when API call fails with 401', async () => {
    // Mock the static parseCredentials method
    const parseCredentialsSpy = jest.spyOn(TrelloClient, 'parseCredentials').mockReturnValue({
      apiKey: 'invalid-key',
      token: 'invalid-token',
    });

    const mockGetCurrentMember = jest.fn().mockResolvedValue({
      status_code: 401,
      api_delay: 0,
      message: 'Authentication failed. Invalid API key or token',
    });

    // Mock the constructor
    (TrelloClient as jest.MockedClass<typeof TrelloClient>).mockImplementation(() => ({
      getCurrentMember: mockGetCurrentMember,
    } as any));

    const result = await run([mockEvent]);

    expect(result).toEqual({
      authenticated: false,
      status_code: 401,
      api_delay: 0,
      message: 'Authentication failed. Invalid API key or token',
    });
  });

  it('should handle rate limiting with proper api_delay', async () => {
    // Mock the static parseCredentials method
    const parseCredentialsSpy = jest.spyOn(TrelloClient, 'parseCredentials').mockReturnValue({
      apiKey: 'test-api-key',
      token: 'test-token',
    });

    const mockGetCurrentMember = jest.fn().mockResolvedValue({
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded. Retry after 30 seconds',
    });

    // Mock the constructor
    (TrelloClient as jest.MockedClass<typeof TrelloClient>).mockImplementation(() => ({
      getCurrentMember: mockGetCurrentMember,
    } as any));

    const result = await run([mockEvent]);

    expect(result).toEqual({
      authenticated: false,
      status_code: 429,
      api_delay: 30,
      message: 'Rate limit exceeded. Retry after 30 seconds',
    });
  });

  it('should return error when no events are provided', async () => {
    const result = await run([]);

    expect(result).toEqual({
      authenticated: false,
      status_code: 0,
      api_delay: 0,
      message: 'Authentication check failed: No events provided',
    });
  });

  it('should return error when connection data is missing', async () => {
    const eventWithoutConnectionData = {
      ...mockEvent,
      payload: {}
    };

    const result = await run([eventWithoutConnectionData]);

    expect(result).toEqual({
      authenticated: false,
      status_code: 0,
      api_delay: 0,
      message: 'Authentication check failed: Missing connection data',
    });
  });

  it('should return error when credentials parsing fails', async () => {
    const eventWithInvalidKey = {
      ...mockEvent,
      payload: {
        connection_data: {
          key: 'invalid-format'
        }
      }
    };

    jest.spyOn(TrelloClient, 'parseCredentials').mockImplementation(() => {
      throw new Error('Invalid connection data: missing API key or token');
    });

    const result = await run([eventWithInvalidKey]);

    expect(result).toEqual({
      authenticated: false,
      status_code: 0,
      api_delay: 0,
      message: 'Authentication check failed: Invalid connection data: missing API key or token',
    });
  });

  it('should handle undefined events array', async () => {
    // @ts-ignore - Testing invalid input
    const result = await run(undefined);

    expect(result).toEqual({
      authenticated: false,
      status_code: 0,
      api_delay: 0,
      message: 'Authentication check failed: No events provided',
    });
  });
});