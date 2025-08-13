import { callSnapInFunction } from './utils';
import axios from 'axios';

describe('Acceptance Test - fetch_board_cards Function', () => {
  // Clean up after all tests
  afterAll(async () => {
    // Close any pending axios connections
    await new Promise(resolve => setTimeout(resolve, 500));
  });
  
  // Use the specific board ID required for the acceptance test  
  const specificBoardId = '688725dad59c015ce052eecf';
  
  test('should fetch exactly 50 cards when limit is 100 and before parameter is set to 688725fdf26b3c50430cae23', async () => {
    // Set up test parameters
    const limit = 100;
    const before = '688725fdf26b3c50430cae23';
    
    try {
      // Call the function with the specified parameters
      const response = await callSnapInFunction(
        'fetch_board_cards',
        { limit, before },
        { external_sync_unit_id: specificBoardId }
      );
      
      // Verify response status
      expect(response.status).toBe(200);
      
      // Extract the function result
      const result = response.data.function_result;
      
      // Log detailed information for debugging if the test fails
      if (!result || !result.success || !Array.isArray(result.cards)) {
        console.error('Unexpected response structure:', JSON.stringify(result, null, 2));
      }
      
      // Verify the result structure
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      
      // Verify cards array exists
      expect(Array.isArray(result.cards)).toBe(true);
      
      // The key acceptance criteria: exactly 50 cards should be returned
      expect(result.cards.length).toBe(50);
      // Informational message: Expected exactly 50 cards but got ${result.cards ? result.cards.length : 0} cards
      
      // Additional validation of card structure (first card)
      if (result.cards.length > 0) {
        const firstCard = result.cards[0];
        expect(firstCard.id).toBeDefined();
        expect(firstCard.name).toBeDefined();
        
        // Log the first and last card IDs for debugging purposes
        console.log(`First card ID: ${firstCard.id}, name: ${firstCard.name}`);
        if (result.cards.length > 1) {
          const lastCard = result.cards[result.cards.length - 1];
          console.log(`Last card ID: ${lastCard.id}, name: ${lastCard.name}`);
        }
      }
    } catch (error) {
      // Provide detailed error information for debugging
      if (error instanceof Error) {
        console.error('Test failed with error:', error.message);
        console.error('Error stack:', error.stack);
      } else {
        console.error('Test failed with unknown error:', error);
      }
      throw error;
    }
  }, 60000); // Allow up to 60 seconds for this test to complete
});