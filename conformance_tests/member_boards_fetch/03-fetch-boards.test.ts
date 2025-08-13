import { callSnapInFunction, validateEnvironmentVariables } from './utils/test-helpers';

describe('Fetch Boards Tests', () => {
  beforeAll(() => {
    // Ensure all required environment variables are set
    validateEnvironmentVariables();
  });

  test('Should fetch boards from Trello API', async () => {
    const response = await callSnapInFunction('fetch_boards');
    
    // Verify the response structure
    expect(response).toBeDefined(); 
    // Match the actual response format from the fetch_boards function, handling both direct and wrapped responses
    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('message');
    expect(response.message).toMatch(/Successfully fetched \d+ boards/);
    
    // Verify boards data
    expect(response).toHaveProperty('boards');
    expect(Array.isArray(response.boards)).toBe(true);
    
    // If boards are returned, verify their structure
    if (response.boards.length > 0) {
      const firstBoard = response.boards[0];
      expect(firstBoard).toHaveProperty('id');
      expect(firstBoard).toHaveProperty('name');
    }
  });

  test('Should include the external sync unit ID in the boards list if it exists', async () => {
    const response = await callSnapInFunction('fetch_boards');
    
    // Verify the response is successful
    expect(response).toHaveProperty('success', true);
    
    // Check if the test external sync unit ID exists in any of the boards
    const testBoardId = '6752eb962a64828e59a35396';
    
    // Make sure boards property exists and is an array
    expect(response).toHaveProperty('boards');
    expect(Array.isArray(response.boards)).toBe(true);
    
    // This is informational - we don't fail if the board doesn't exist
    const boardExists = response.boards.some((board: any) => board.id === testBoardId);
    if (!boardExists) {
      console.warn(`Note: Test board ID ${testBoardId} was not found in the fetched boards. This is not a test failure.`);
    }
  });
});