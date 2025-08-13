import { callSnapInFunction } from './utils/test-helpers';

describe('Basic Connectivity Tests', () => {
  test('Health check function should respond successfully', async () => {
    // This is the simplest test to verify the Snap-In server is running
    const response = await callSnapInFunction('health_check');
    
    expect(response).toBeDefined();
    // Match the actual response format from the health_check function, handling both direct and wrapped responses
    expect(response).toHaveProperty('status', 'operational');
    expect(response).toHaveProperty('message', 'Function can be invoked successfully');

  });
});