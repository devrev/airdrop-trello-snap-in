import { loadTestEvent, sendToSnapInServer } from './utils';

describe('fetch_boards acceptance tests', () => {
  // Acceptance Test: Verify the function returns a board named "SaaS connectors"
  test('should return a board named "SaaS connectors"', async () => {
    // Load the test event for the fetch_boards function
    const event = loadTestEvent('fetch_boards');
    
    // Send the event to the snap-in server
    const response = await sendToSnapInServer(event);
    
    // Basic validation of the response
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    expect(response.function_result).toBeDefined();
    
    // Verify the function executed successfully
    expect(response.function_result.success).toBe(true);
    if (!response.function_result.success) {
      console.error('Expected function to execute successfully, but it failed. Check API credentials and connectivity.');
    }
    
    expect(response.function_result.status_code).toBe(200);
    if (response.function_result.status_code !== 200) {
      console.error(`Expected status code 200, but got ${response.function_result.status_code}. API may be unavailable or credentials invalid.`);
    }
    
    // Verify boards were returned
    expect(response.function_result.boards).toBeDefined();
    expect(Array.isArray(response.function_result.boards)).toBe(true);
    if (!Array.isArray(response.function_result.boards)) {
      console.error('Expected boards to be an array, but it is not. The API response format may have changed.');
    }
    
    // Check if there are any boards returned
    expect(response.function_result.boards.length).toBeGreaterThan(0);
    if (response.function_result.boards.length === 0) {
      console.error('No boards were returned. The user may not have access to any boards or the API response format may have changed.');
    }
    
    // Find the "SaaS connectors" board
    const saasConnectorsBoard = response.function_result.boards.find((board: any) => board.name === 'SaaS connectors');
    
    // Verify the board exists
    expect(saasConnectorsBoard).toBeDefined();
    if (!saasConnectorsBoard) {
      console.error('Could not find a board named "SaaS connectors". ' +
        'This board may not exist in the account associated with the provided credentials, ' +
        'or it may have been renamed. Available boards: ' +
        JSON.stringify(response.function_result.boards.map((b: any) => b.name)));
    }
    
    // Additional validation of board properties
    expect(saasConnectorsBoard.id).toBeDefined();
    expect(saasConnectorsBoard.url).toBeDefined();
    
    // Log success message for clarity
    console.log(`Successfully found "SaaS connectors" board with ID: ${saasConnectorsBoard.id}`);
  });
});