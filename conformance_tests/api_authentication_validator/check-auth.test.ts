import { callSnapInFunction } from './utils';

describe('Trello API Authentication Tests', () => {
  // Read environment variables
  const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
  const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
  const TRELLO_ORGANIZATION_ID = process.env.TRELLO_ORGANIZATION_ID;

  // Check if required environment variables are set
  beforeAll(() => {
    if (!TRELLO_API_KEY) {
      console.warn('TRELLO_API_KEY environment variable is not set');
    }
    if (!TRELLO_TOKEN) {
      console.warn('TRELLO_TOKEN environment variable is not set');
    }
    if (!TRELLO_ORGANIZATION_ID) {
      console.warn('TRELLO_ORGANIZATION_ID environment variable is not set');
    }
  });

  // Test 1: Basic invocation test
  test('check_auth function can be invoked', async () => {
    const response = await callSnapInFunction('check_auth', {});
    
    // Verify that we got a response (even if authentication fails due to missing data)
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result).toHaveProperty('authenticated');
    expect(response.function_result).toHaveProperty('message');
  });

  // Test 2: Missing connection data test
  test('check_auth returns appropriate error when connection data is missing', async () => {
    const response = await callSnapInFunction('check_auth', {});
    
    // Verify that authentication fails with appropriate message
    expect(response.function_result.authenticated).toBe(false);
    expect(response.function_result.message).toContain('Missing connection data');
  });

  // Test 3: Invalid key format test
  test('check_auth returns appropriate error when key format is invalid', async () => {
    const response = await callSnapInFunction('check_auth', {
      connection_data: {
        key: 'invalid-format'
      }
    });
    
    // Verify that authentication fails with appropriate message
    expect(response.function_result.authenticated).toBe(false);
    expect(response.function_result.message).toContain('Authentication failed');
  });

  // Test 4: Authentication success test (when environment variables are available)
  test('check_auth succeeds with valid credentials', async () => {
    // Skip test if environment variables are not set
    if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
      console.log('Skipping authentication success test due to missing environment variables');
      return;
    }

    const response = await callSnapInFunction('check_auth', {
      connection_data: {
        key: `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`
      }
    });
    
    // Verify that authentication succeeds
    expect(response.function_result.authenticated).toBe(true);
    expect(response.function_result.message).toContain('Successfully authenticated');
  });

  // Test 5: Authentication failure test with invalid credentials
  test('check_auth fails with invalid credentials', async () => {
    const response = await callSnapInFunction('check_auth', {
      connection_data: {
        key: 'key=invalid_key&token=invalid_token'
      }
    });
    
    // Verify that authentication fails
    expect(response.function_result.authenticated).toBe(false);
    expect(response.function_result.message).toContain('Authentication failed');
  });
});