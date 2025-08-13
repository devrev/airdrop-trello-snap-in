import { callSnapInFunction, validateEnvironmentVariables } from './utils/test-helpers';

describe('Acceptance Tests', () => {
  beforeAll(() => {
    // Ensure all required environment variables are set
    validateEnvironmentVariables();
  });

  test('Should fetch a board named "SaaS connectors" from Trello API', async () => {
    const response = await callSnapInFunction('fetch_boards');
    
    // Verify the response structure
    expect(response).toBeDefined();
    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('message');
    expect(response.message).toMatch(/Successfully fetched \d+ boards/);
    
    // Verify boards data exists
    expect(response).toHaveProperty('boards');
    expect(Array.isArray(response.boards)).toBe(true);
    
    // Check if "SaaS connectors" board exists in the response
    const saasConnectorsBoard = response.boards.find((board: any) => 
      board.name === "SaaS connectors"
    );
    
    // If the board isn't found, log the available boards to help with debugging
    if (!saasConnectorsBoard) {
      console.error('Available boards:', response.boards.map((b: any) => ({ id: b.id, name: b.name })));
      fail('Board named "SaaS connectors" was not found in the fetched boards. This test requires access to a board with this specific name.');
    }
    
    // Verify the board has the expected properties
    expect(saasConnectorsBoard).toBeDefined();
    expect(saasConnectorsBoard).toHaveProperty('id');
    expect(saasConnectorsBoard).toHaveProperty('name', 'SaaS connectors');
    
    // Additional checks for board properties that should be present
    expect(saasConnectorsBoard).toHaveProperty('url');
    expect(saasConnectorsBoard).toHaveProperty('shortUrl');
  });
});