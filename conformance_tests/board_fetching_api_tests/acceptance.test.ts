import { callSnapInFunction } from './utils';

describe('Trello Snap-In Acceptance Tests', () => {
  test('should fetch a board named "SaaS connectors"', async () => {
    // Call the get_boards function
    const result = await callSnapInFunction('get_boards');
    
    // Verify the function executed successfully
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.status).toBe('success');
    
    // Verify boards were returned
    expect(result.function_result.boards).toBeDefined();
    expect(Array.isArray(result.function_result.boards)).toBe(true);
    
    // Log the total number of boards for debugging
    console.log(`Total boards fetched: ${result.function_result.boards.length}`);
    
    // Find the "SaaS connectors" board
    const saasConnectorsBoard = result.function_result.boards.find(
      (board: any) => board.name === 'SaaS connectors'
    );
    
    // If the board isn't found, log all board names for debugging
    if (!saasConnectorsBoard) {
      const boardNames = result.function_result.boards.map((board: any) => board.name);
      console.error('Available board names:', boardNames);
    }
    
    // Assert that the "SaaS connectors" board exists
    expect(saasConnectorsBoard).toBeDefined();
    expect(saasConnectorsBoard).not.toBeNull();
    expect(saasConnectorsBoard.name).toBe('SaaS connectors');
    
    // Additional validation of the board properties
    expect(saasConnectorsBoard.id).toBeDefined();
    expect(saasConnectorsBoard.url).toBeDefined();
    expect(typeof saasConnectorsBoard.closed).toBe('boolean');
  });
});