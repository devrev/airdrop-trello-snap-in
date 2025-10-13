import { getTestCredentials, createTestEventPayload, CallbackServer, callSnapInFunction, TestCredentials } from './test-utils';

describe('fetch_boards function acceptance tests', () => {
  let callbackServer: CallbackServer;
  let credentials: TestCredentials;

  beforeAll(async () => {
    // Setup callback server
    callbackServer = new CallbackServer();
    await callbackServer.start();

    // Get test credentials
    try {
      credentials = getTestCredentials();
    } catch (error) {
      throw new Error(`Failed to get test credentials for acceptance test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  afterAll(async () => {
    // Cleanup callback server
    if (callbackServer) {
      await callbackServer.stop();
    }
  });

  test('should return a board with the name "SaaS connectors"', async () => {
    // Acceptance Test: Verify that the fetch_boards function returns a board named "SaaS connectors"
    const payload = createTestEventPayload('fetch_boards', credentials);
    
    let response;
    try {
      response = await callSnapInFunction('fetch_boards', payload);
    } catch (error) {
      fail(`Failed to invoke fetch_boards function for acceptance test: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Verify response structure
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    
    const result = response.function_result;
    
    // The function must succeed to check for the specific board
    if (result.status !== 'success') {
      fail(`fetch_boards function failed with status: ${result.status}, status_code: ${result.status_code}, message: ${result.message}. Cannot verify board existence without successful API response.`);
    }

    // Verify boards array exists
    expect(result.boards).toBeDefined();
    expect(Array.isArray(result.boards)).toBe(true);
    
    if (!result.boards || result.boards.length === 0) {
      fail(`No boards returned from fetch_boards function. Expected to find a board named "SaaS connectors" but received empty boards array.`);
    }

    // Extract all board names for debugging
    const boardNames = result.boards.map((board: any) => board.name || 'unnamed');
    
    // Check if "SaaS connectors" board exists
    const saasConnectorsBoard = result.boards.find((board: any) => 
      board.name === 'SaaS connectors'
    );

    if (!saasConnectorsBoard) {
      fail(`Board with name "SaaS connectors" not found in the returned boards. ` +
           `Available boards: [${boardNames.join(', ')}]. ` +
           `Total boards returned: ${result.boards.length}. ` +
           `Please verify that a board named "SaaS connectors" exists in the Trello account associated with the test credentials.`);
    }

    // Verify the found board has required properties
    expect(saasConnectorsBoard).toHaveProperty('id');
    expect(saasConnectorsBoard).toHaveProperty('name');
    expect(saasConnectorsBoard).toHaveProperty('closed');
    
    expect(typeof saasConnectorsBoard.id).toBe('string');
    expect(saasConnectorsBoard.name).toBe('SaaS connectors');
    expect(typeof saasConnectorsBoard.closed).toBe('boolean');
    
    // Log success for debugging
    console.log(`Successfully found "SaaS connectors" board with ID: ${saasConnectorsBoard.id}, closed: ${saasConnectorsBoard.closed}`);
  });

  test('should verify "SaaS connectors" board properties and structure', async () => {
    // Additional acceptance test to verify the board structure is complete
    const payload = createTestEventPayload('fetch_boards', credentials);
    
    let response;
    try {
      response = await callSnapInFunction('fetch_boards', payload);
    } catch (error) {
      fail(`Failed to invoke fetch_boards function for board structure verification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const result = response.function_result;
    
    if (result.status !== 'success') {
      fail(`fetch_boards function failed during board structure verification: ${result.message}`);
    }

    const saasConnectorsBoard = result.boards?.find((board: any) => 
      board.name === 'SaaS connectors'
    );

    if (!saasConnectorsBoard) {
      fail(`"SaaS connectors" board not found during structure verification. This test depends on the board existing.`);
    }

    // Verify all expected board properties are present and have correct types
    const requiredStringProperties = ['id', 'name'];
    const requiredBooleanProperties = ['closed'];
    const optionalStringProperties = ['desc', 'url', 'short_url', 'date_last_activity', 'idOrganization'];

    // Check required string properties
    requiredStringProperties.forEach(prop => {
      expect(saasConnectorsBoard).toHaveProperty(prop);
      expect(typeof saasConnectorsBoard[prop]).toBe('string');
      expect(saasConnectorsBoard[prop]).toBeTruthy();
    });

    // Check required boolean properties
    requiredBooleanProperties.forEach(prop => {
      expect(saasConnectorsBoard).toHaveProperty(prop);
      expect(typeof saasConnectorsBoard[prop]).toBe('boolean');
    });

    // Check optional properties (if present, should have correct type)
    optionalStringProperties.forEach(prop => {
      if (saasConnectorsBoard.hasOwnProperty(prop) && saasConnectorsBoard[prop] !== null) {
        expect(typeof saasConnectorsBoard[prop]).toBe('string');
      }
    });

    // Log board details for debugging
    console.log(`"SaaS connectors" board details:`, {
      id: saasConnectorsBoard.id,
      name: saasConnectorsBoard.name,
      closed: saasConnectorsBoard.closed,
      hasDescription: !!saasConnectorsBoard.desc,
      hasUrl: !!saasConnectorsBoard.url,
      organizationId: saasConnectorsBoard.idOrganization || 'none'
    });
  });
});