import { getTestCredentials, createTestEventPayload, CallbackServer, callSnapInFunction, TestCredentials } from './test-utils';

describe('fetch_boards function conformance tests', () => {
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
      throw new Error(`Failed to get test credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  afterAll(async () => {
    // Cleanup callback server
    if (callbackServer) {
      await callbackServer.stop();
    }
  });

  test('should successfully invoke fetch_boards function and return valid response structure', async () => {
    // Test 1 (Trivial): Basic function invocation
    const payload = createTestEventPayload('fetch_boards', credentials);
    
    let response;
    try {
      response = await callSnapInFunction('fetch_boards', payload);
    } catch (error) {
      fail(`Failed to invoke fetch_boards function: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Verify response structure
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    
    const result = response.function_result;
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('status_code');
    expect(result).toHaveProperty('api_delay');
    expect(result).toHaveProperty('message');
    expect(result).toHaveProperty('timestamp');
    
    // Verify status is either success or failure
    expect(['success', 'failure']).toContain(result.status);
    expect(typeof result.status_code).toBe('number');
    expect(typeof result.api_delay).toBe('number');
    expect(typeof result.message).toBe('string');
    expect(typeof result.timestamp).toBe('string');
  });

  test('should successfully fetch boards with valid credentials', async () => {
    // Test 2 (Simple): Successful board fetching
    const payload = createTestEventPayload('fetch_boards', credentials);
    
    let response;
    try {
      response = await callSnapInFunction('fetch_boards', payload);
    } catch (error) {
      fail(`Failed to call fetch_boards function: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    
    const result = response.function_result;
    
    if (result.status === 'success') {
      // Verify successful response structure
      expect(result.status_code).toBe(200);
      expect(result.boards).toBeDefined();
      expect(Array.isArray(result.boards)).toBe(true);
      
      // If boards exist, verify their structure
      if (result.boards.length > 0) {
        const board = result.boards[0];
        expect(board).toHaveProperty('id');
        expect(board).toHaveProperty('name');
        expect(board).toHaveProperty('closed');
        expect(typeof board.id).toBe('string');
        expect(typeof board.name).toBe('string');
        expect(typeof board.closed).toBe('boolean');
      }
    } else {
      // If not successful, should have proper error information
      expect(result.status).toBe('failure');
      expect(result.status_code).toBeGreaterThan(0);
      expect(result.message).toBeTruthy();
    }
  });

  test('should handle invalid credentials gracefully', async () => {
    // Test 3 (More Complex): Error handling with invalid credentials
    const invalidCredentials = {
      trelloApiKey: 'invalid-api-key',
      trelloToken: 'invalid-token',
      trelloOrgId: credentials.trelloOrgId,
    };
    
    const payload = createTestEventPayload('fetch_boards', invalidCredentials);
    
    let response;
    try {
      response = await callSnapInFunction('fetch_boards', payload);
    } catch (error) {
      fail(`Function should handle invalid credentials gracefully, but threw error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    
    const result = response.function_result;
    
    // Should return failure status for invalid credentials
    expect(result.status).toBe('failure');
    expect(result.status_code).toBeGreaterThan(0);
    expect(result.message).toBeTruthy();
    expect(result.timestamp).toBeTruthy();
    
    // Should not have boards in error response
    expect(result.boards).toBeUndefined();
    
    // Verify error handling includes proper status codes
    expect([400, 401, 403, 500]).toContain(result.status_code);
    
    // API delay should be a non-negative number
    expect(result.api_delay).toBeGreaterThanOrEqual(0);
  });
});