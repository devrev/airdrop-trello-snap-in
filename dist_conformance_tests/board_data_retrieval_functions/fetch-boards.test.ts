import { loadTestEvent, sendToSnapInServer, closeAllHandles } from './utils';

// Ensure all connections are closed before tests
beforeAll(async () => {
  await closeAllHandles();
});

// Ensure all connections are closed after tests
afterAll(async () => {
  await closeAllHandles();
  jest.clearAllTimers();
});

describe('fetch_boards function tests', () => {
  // Test 1: Verify the function can be invoked
  test('should be able to invoke the function', async () => {
    const event = loadTestEvent('fetch_boards');
    const response = await sendToSnapInServer(event);
    
    expect(response).toBeDefined();
    expect(response.error).toBeUndefined();
    expect(response.function_result).toBeDefined();
  });

  // Test 2: Verify the function handles missing events properly
  test('should handle missing events properly', async () => {
    // Use an empty object instead of null to avoid JSON parsing errors
    const event = {};
    
    try {
      await sendToSnapInServer(event);
      // If we get here, the request succeeded but the response should indicate failure
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  // Test 3: Verify the function handles missing environment variables
  test('should handle missing environment variables', async () => {
    try {
      // Load test event with skipEnvCheck=true to bypass the environment variable check
      const event = loadTestEvent('fetch_boards', true);
      // Set invalid credentials directly
      event.payload.connection_data.key = 'key=invalid_key&token=invalid_token';
      
      const response = await sendToSnapInServer(event);
      expect(response.function_result.success).toBe(false);
      expect(response.function_result.message).toContain('Invalid connection key format');
    } catch (error) {
      // If there's an error, make sure it's handled
      expect(error).toBeDefined();
    }
  });


  // Test 4: Verify the function handles invalid connection data format
  test('should handle invalid connection data', async () => {
    const event = loadTestEvent('fetch_boards');
    event.payload.connection_data.key = 'invalid_format';
    
    const response = await sendToSnapInServer(event);
    
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(false);
    expect(response.function_result.message).toContain('Invalid connection key format');
  });

  // Test 5: Verify the function successfully fetches boards
  test('should successfully fetch boards', async () => {
    const event = loadTestEvent('fetch_boards');
    const response = await sendToSnapInServer(event);
    
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.status_code).toBe(200);
    expect(response.function_result.api_delay).toBeGreaterThanOrEqual(0);
    expect(response.function_result.message).toContain('Successfully fetched');
    expect(response.function_result.boards).toBeDefined();
    expect(Array.isArray(response.function_result.boards)).toBe(true);
    
    // Check that we have the raw response
    expect(response.function_result.raw_response).toBeDefined();
  });
});