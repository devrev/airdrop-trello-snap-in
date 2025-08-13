import { createBasicEvent, invokeFunction } from './utils';

describe('Health Check Function Tests', () => {
  test('Health check function can be invoked', async () => {
    // Create a basic event for the health_check function
    const event = createBasicEvent('health_check');
    
    // Invoke the function
    const response = await invokeFunction(event);
    
    // Validate the response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();
    expect(response.data.function_result.status).toBe('operational');
    expect(response.data.function_result.message).toBe('Function can be invoked successfully');
  });
});