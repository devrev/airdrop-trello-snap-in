import { ApiClient } from './utils/api-client';
import { getRequiredEnvVars } from './utils/environment';

describe('Trello Auth Check Function Tests', () => {
  let apiClient: ApiClient;
  let envVars: {
    trelloApiKey: string;
    trelloToken: string;
    trelloOrgId: string;
  };

  beforeAll(() => {
    // Initialize the API client
    apiClient = new ApiClient();
    
    // Get environment variables
    try {
      envVars = getRequiredEnvVars();
    } catch (error) {
      console.error('Error getting environment variables:', error);
      throw error;
    }
  });

  // Test 1: Basic test - Function can be called and returns a response
  test('auth_check function returns a response', async () => {
    // Call the auth_check function
    const response = await apiClient.callAuthCheck(
      envVars.trelloApiKey,
      envVars.trelloToken
    );
    
    // Verify that we got a response with the expected structure
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.status).toBeDefined();
    expect(response.function_result.message).toBeDefined();
  });

  // Test 2: Intermediate test - Function returns success with valid credentials
  test('auth_check function returns success with valid credentials', async () => {
    // Call the auth_check function
    const response = await apiClient.callAuthCheck(
      envVars.trelloApiKey,
      envVars.trelloToken
    );
    
    // Verify that the function returned a success status
    expect(response.function_result.status).toBe('success');
    expect(response.function_result.message).toContain('Authentication with Trello API successful');
  });

  // Test 3: Advanced test - Function returns expected user data structure
  test('auth_check function returns expected user data structure', async () => {
    // Call the auth_check function
    const response = await apiClient.callAuthCheck(
      envVars.trelloApiKey,
      envVars.trelloToken
    );
    
    // Verify that the function returned the expected user data structure
    expect(response.function_result.user).toBeDefined();
    expect(response.function_result.user.id).toBeDefined();
    expect(typeof response.function_result.user.id).toBe('string');
    expect(response.function_result.user.username).toBeDefined();
    expect(typeof response.function_result.user.username).toBe('string');
    
    // These fields might be optional depending on user settings, so we just check type if present
    if (response.function_result.user.full_name !== undefined) {
      expect(typeof response.function_result.user.full_name).toBe('string');
    }
    
    if (response.function_result.user.email !== undefined) {
      expect(typeof response.function_result.user.email).toBe('string');
    }
  });
});