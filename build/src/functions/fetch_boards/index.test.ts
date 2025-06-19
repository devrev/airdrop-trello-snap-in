import axios from 'axios';
import { EventType } from '@devrev/ts-adaas';
import { handler } from './index';
import { createMockEvent, createMockPayload } from './test-utils';

// Original axios get method
const originalAxiosGet = axios.get;

describe('fetch_boards function', () => {
  // Spy on axios get method
  let axiosGetSpy: jest.SpyInstance;

  beforeEach(() => {
    // Setup spy before each test
    axiosGetSpy = jest.spyOn(axios, 'get');
  });

  afterEach(() => {
    axiosGetSpy.mockRestore();
  });

  it('should return boards when API call is successful', async () => {
    // Mock successful API response
    const mockBoards = [
      {
        id: 'board1',
        name: 'Test Board 1',
        desc: 'Description for board 1',
        url: 'https://trello.com/b/board1',
        shortUrl: 'https://trello.com/b/sh1',
        closed: false,
        idOrganization: 'org1'
      },
      {
        id: 'board2',
        name: 'Test Board 2',
        desc: 'Description for board 2',
        url: 'https://trello.com/b/board2',
        shortUrl: 'https://trello.com/b/sh2',
        closed: true,
        idOrganization: 'org1'
      }
    ];
    
    (axios.get as jest.Mock).mockResolvedValueOnce({
      status: 200,
      data: mockBoards
    });
    
    const mockEvent = createMockEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: true,
      message: 'Successfully fetched 2 boards from Trello API',
      boards: [
        {
          id: 'board1',
          name: 'Test Board 1',
          description: 'Description for board 1',
          url: 'https://trello.com/b/board1',
          short_url: 'https://trello.com/b/sh1',
          is_closed: false,
          organization_id: 'org1'
        },
        {
          id: 'board2',
          name: 'Test Board 2',
          description: 'Description for board 2',
          url: 'https://trello.com/b/board2',
          short_url: 'https://trello.com/b/sh2',
          is_closed: true,
          organization_id: 'org1'
        }
      ]
    });

    // Verify axios was called with the correct parameters
    expect(axiosGetSpy).toHaveBeenCalledWith(
      'https://api.trello.com/1/members/me/boards',
      expect.objectContaining({
        params: {
          key: 'test-api-key',
          token: 'test-token',
          fields: 'name,desc,url,closed,idOrganization,shortUrl'
        },
        timeout: 10000
      })
    );
  });

  it('should return empty boards array when API returns no boards', async () => {
    // Mock empty API response
    (axios.get as jest.Mock).mockResolvedValueOnce({
      status: 200,
      data: []
    });
    
    const mockEvent = createMockEvent();

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: true,
      message: 'Successfully fetched 0 boards from Trello API',
      boards: []
    });
  });

  it('should return error when API call fails', async () => {
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
      success: false,
      message: 'Failed to fetch boards with status 401: Unauthorized',
      error: {
        status: 401,
        data: { message: 'Invalid token' }
      }
    });
  });

  it('should return error when no response is received', async () => {
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
      success: false,
      message: 'Failed to fetch boards: Network Error',
      error: {}
    });
  });

  it('should return error when connection data is missing', async () => {
    const mockEvent = createMockEvent();
    // Remove connection data from the payload
    mockEvent.payload.connection_data = undefined as any;

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Missing connection data in payload'
    });

    // Verify axios get was not called
    expect(axiosGetSpy).not.toHaveBeenCalled();
  });

  it('should return error when key is missing in connection data', async () => {
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
      success: false,
      message: 'Missing key in connection data'
    });

    // Verify axios get was not called
    expect(axiosGetSpy).not.toHaveBeenCalled();
  });

  it('should return error when key format is invalid', async () => {
    const mockEvent = createMockEvent();
    // Set invalid key format
    mockEvent.payload.connection_data.key = 'invalid-format';

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Failed to fetch boards: Failed to extract credentials: Invalid key format. Expected format: "key=<api_key>&token=<token>"',
      error: {}
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
});