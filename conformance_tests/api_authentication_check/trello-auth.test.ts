import { callSnapInFunction, getTrelloCredentials } from './utils/test-utils';

describe('Trello Authentication Check', () => {
  // Basic test to verify function structure
  test('should return a properly structured response', async () => {
    const result = await callSnapInFunction('trello_auth_check');
    
    // Check that the response has the expected structure
    expect(result).toHaveProperty('function_result');
    expect(result.function_result).toHaveProperty('authenticated');
    expect(result.function_result).toHaveProperty('message');
    expect(typeof result.function_result.authenticated).toBe('boolean');
    expect(typeof result.function_result.message).toBe('string');
  });

  // Test with valid credentials
  test('should authenticate successfully with valid credentials', async () => {
    const { apiKey, token } = getTrelloCredentials();
    
    // Make sure we have credentials before running the test
    expect(apiKey).toBeTruthy();
    expect(token).toBeTruthy();
    
    const result = await callSnapInFunction('trello_auth_check');
    
    // Check for successful authentication
    expect(result.function_result.authenticated).toBe(true);
    expect(result.function_result.message).toContain('Successfully authenticated');
    
    // Check that user data is returned
    expect(result.function_result).toHaveProperty('user');
    expect(result.function_result.user).toHaveProperty('id');
    expect(result.function_result.user).toHaveProperty('username');
  });

  // Test with invalid credentials
  test('should fail authentication with invalid credentials', async () => {
    // Create a payload with invalid credentials
    const payload = {
      connection_data: {
        org_id: 'test-org-id',
        org_name: 'Test Organization',
        key: 'key=invalid_key&token=invalid_token',
        key_type: 'api_key'
      }
    };
    
    const result = await callSnapInFunction('trello_auth_check', payload);
    
    // Check for failed authentication
    expect(result.function_result.authenticated).toBe(false);
    expect(result.function_result.message).toContain('Authentication failed');
    expect(result.function_result).not.toHaveProperty('user');
  });
});