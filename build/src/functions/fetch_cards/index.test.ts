import axios from 'axios';
import { EventType } from '@devrev/ts-adaas';
import { handler } from './index';
import { createMockEvent } from './test-utils';
import { setupTest, createMockCards, createExpectedCards } from './test-helpers';

describe('fetch_cards function', () => {
  // Test utilities
  let testUtils: ReturnType<typeof setupTest>;

  beforeEach(() => {
    // Setup test environment before each test
    testUtils = setupTest();
  });

  afterEach(() => {
    // Clean up after each test
    testUtils.cleanup();
  });

  it('should return cards when API call is successful', async () => {
    // Create mock cards
    const mockCards = createMockCards();
    
    // Mock successful API response
    testUtils.mockSuccessfulResponse(mockCards);
    
    const mockEvent = testUtils.createTestEvent('board1');

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: true,
      message: 'Successfully fetched 2 cards from board board1',
      cards: createExpectedCards(mockCards)
    });

    // Verify axios was called with the correct parameters
    expect(testUtils.axiosGetSpy).toHaveBeenCalledWith(
      'https://api.trello.com/1/boards/board1/cards',
      expect.objectContaining({
        params: {
          key: 'test-api-key',
          token: 'test-token',
          fields: 'name,desc,closed,idList,idBoard,url,shortUrl,due,dueComplete,labels,idMembers'
        },
        timeout: 10000
      })
    );
  });

  it('should return empty cards array when API returns no cards', async () => {
    // Mock empty API response
    testUtils.mockEmptyResponse();
    
    const mockEvent = testUtils.createTestEvent('board1');

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: true,
      message: 'Successfully fetched 0 cards from board board1',
      cards: []
    });
  });

  it('should return error when API call fails', async () => {
    // Mock failed API response
    testUtils.mockFailedResponse(401, 'Unauthorized', { message: 'Invalid token' });
    
    const mockEvent = testUtils.createTestEvent('board1');

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Failed to fetch cards with status 401: Unauthorized',
      error: {
        status: 401,
        data: { message: 'Invalid token' }
      }
    });
  });

  it('should return error when no response is received', async () => {
    // Mock network error
    testUtils.mockNetworkError();
    
    const mockEvent = testUtils.createTestEvent('board1');

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Failed to fetch cards: Network Error',
      error: {}
    });
  });

  it('should return error when connection data is missing', async () => {
    const mockEvent = testUtils.createTestEvent('board1');
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
    expect(testUtils.axiosGetSpy).not.toHaveBeenCalled();
  });

  it('should return error when key is missing in connection data', async () => {
    const mockEvent = testUtils.createTestEvent('board1');
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
    expect(testUtils.axiosGetSpy).not.toHaveBeenCalled();
  });

  it('should return error when board ID is missing in event context', async () => {
    const mockEvent = testUtils.createTestEvent('');
    // Create a new event context object without the external_sync_unit_id property
    mockEvent.payload.event_context.external_sync_unit_id = '';

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Missing board ID in event context'
    });

    // Verify axios get was not called
    expect(testUtils.axiosGetSpy).not.toHaveBeenCalled();
  });

  it('should return error when key format is invalid', async () => {
    const mockEvent = testUtils.createTestEvent('board1');
    // Set invalid key format
    mockEvent.payload.connection_data.key = 'invalid-format';

    // Call the handler function with the mock event
    const result = await handler([mockEvent]);

    // Verify the result
    expect(result).toEqual({
      success: false,
      message: 'Failed to fetch cards: Failed to extract credentials: Invalid key format. Expected format: "key=<api_key>&token=<token>"',
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