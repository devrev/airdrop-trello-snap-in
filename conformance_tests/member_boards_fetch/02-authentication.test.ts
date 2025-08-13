import { callSnapInFunction, validateEnvironmentVariables } from './utils/test-helpers';

describe('Trello Authentication Tests', () => {
  beforeAll(() => {
    // Ensure all required environment variables are set
    validateEnvironmentVariables();
  });

  test('Should authenticate with Trello API using provided credentials', async () => {
    const response = await callSnapInFunction('trello_auth_check');
    
    expect(response).toBeDefined();
    // Match the actual response format from the trello_auth_check function, handling both direct and wrapped responses
    expect(response).toHaveProperty('authenticated', true);
    expect(response).toHaveProperty('message');
    expect(response.message).toContain('Successfully authenticated');
    
    // Check user data is present and has expected properties
    expect(response).toHaveProperty('user');
    expect(response.user).toBeDefined();
    expect(response.user).toHaveProperty('id');
    expect(response.user).toHaveProperty('username');
  });
});