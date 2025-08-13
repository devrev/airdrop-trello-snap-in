import { callSnapInFunction } from './utils';
import axios from 'axios';

describe('fetch_board_cards Function Tests', () => {
  // Clean up after all tests
  afterAll(async () => {
    // Close any pending axios connections
    await new Promise(resolve => setTimeout(resolve, 500));
  });
  
  // Use a valid board ID for testing
  const validBoardId = process.env.TEST_BOARD_ID || '6752eb962a64828e59a35396';
  
  // Test 1: Basic functionality - fetch cards with valid parameters
  test('should successfully fetch cards with valid board ID and limit', async () => {
    const limit = 10;
    const response = await callSnapInFunction(
      'fetch_board_cards',
      { limit },
      { external_sync_unit_id: validBoardId }
    );
    
    expect(response.status).toBe(200);
    
    // The function returns the result directly, not wrapped in a success/message structure
    const result = response.data.function_result;
    expect(result).toBeDefined();
    expect(Array.isArray(result.cards)).toBe(true);
    expect(result.cards.length).toBeLessThanOrEqual(limit);
  }, 30000);

  // Test 2: Pagination - fetch cards with "before" parameter
  test('should successfully fetch cards with pagination using before parameter', async () => {
    // First, get some cards to use one as a cursor
    const firstResponse = await callSnapInFunction(
      'fetch_board_cards',
      { limit: 5 },
      { external_sync_unit_id: validBoardId }
    );
    
    expect(firstResponse.status).toBe(200);
    const firstResult = firstResponse.data.function_result;
    expect(firstResult).toBeDefined();
    
    // If we have cards, use the first one's ID as the "before" parameter
    if (firstResult.cards && firstResult.cards.length > 0) {
      const beforeCardId = firstResult.cards[0].id;
      
      const paginatedResponse = await callSnapInFunction(
        'fetch_board_cards',
        { limit: 5, before: beforeCardId },
        { external_sync_unit_id: validBoardId }
      );
      
      const paginatedResult = paginatedResponse.data.function_result;
      expect(paginatedResponse.status).toBe(200);
      expect(paginatedResult.success).toBe(true);
      expect(paginatedResult).toBeDefined();
    } else {
      // Skip this test if no cards were returned
      console.log('Skipping pagination test as no cards were returned in the first request');
    }
  }, 30000);

  // Test 3: Error handling - missing required parameters
  test('should return error when limit parameter is missing', async () => {
    const response = await callSnapInFunction(
      'fetch_board_cards',
      {}, // Missing limit parameter
      { external_sync_unit_id: validBoardId }
    );
    
    expect(response.status).toBe(200);
    const result = response.data.function_result;
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  }, 30000);

  // Test 4: Error handling - invalid limit parameter
  test('should return error when limit parameter is invalid', async () => {
    const response = await callSnapInFunction(
      'fetch_board_cards',
      { limit: -5 }, // Negative limit
      { external_sync_unit_id: validBoardId }
    );
    
    expect(response.status).toBe(200);
    const result = response.data.function_result;
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  }, 30000);

  // Test 5: Error handling - missing board ID
  test('should return error when board ID is missing', async () => {
    const response = await callSnapInFunction(
      'fetch_board_cards',
      { limit: 10 },
      {} // Missing external_sync_unit_id
    );
    
    expect(response.status).toBe(200);
    const result = response.data.function_result;
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  }, 30000);
});