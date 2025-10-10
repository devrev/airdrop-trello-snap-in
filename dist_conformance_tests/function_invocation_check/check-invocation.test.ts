import { 
  createValidEvent, 
  createMinimalEvent, 
  createInvalidEvent, 
  invokeFunction, 
  setupCallbackServer 
} from './utils';
import { Server } from 'http';

describe('Check Invocation Function Tests', () => {
  let callbackServer: Server;

  beforeAll(() => {
    // Set up the callback server for testing
    callbackServer = setupCallbackServer();
  });

  afterAll(() => {
    // Clean up the callback server
    callbackServer.close();
  });

  // Test 1: Basic test - verify function responds with success for valid event
  test('should successfully invoke the function with valid event', async () => {
    // Arrange
    const event = createValidEvent();
    
    // Act
    const response = await invokeFunction(event);
    
    // Assert
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.can_be_invoked).toBe(true);
    expect(response.function_result.message).toContain('Function can be invoked successfully');
    expect(response.error).toBeUndefined();
  });

  // Test 2: Test with minimal required fields
  test('should successfully invoke the function with minimal event', async () => {
    // Arrange
    const event = createMinimalEvent();
    
    // Act
    const response = await invokeFunction(event);
    
    // Assert
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.can_be_invoked).toBe(true);
    expect(response.function_result.message).toContain('Function can be invoked successfully');
    expect(response.error).toBeUndefined();
  });

  // Test 3: Error handling - verify function handles invalid events appropriately
  test('should handle invalid event gracefully', async () => {
    // Arrange
    const invalidEvent = createInvalidEvent();
    
    // Act & Assert
    await expect(invokeFunction(invalidEvent)).rejects.toThrow();
  });

  // Test 4: Verify function name is correctly processed
  test('should correctly process the function_name in execution_metadata', async () => {
    // Arrange
    const event = createValidEvent();
    event.execution_metadata.function_name = 'invalid_function';
    
    // Act
    const response = await invokeFunction(event);
    
    // Assert
    expect(response).toBeDefined();
    expect(response.error).toBeDefined();
    expect(response.error.err_type).toBe('FUNCTION_NOT_FOUND');
    expect(response.error.err_msg).toContain('Function invalid_function not found');
  });

  // Test 5: Verify function handles event with empty payload
  test('should handle event with empty payload', async () => {
    // Arrange
    const event = createValidEvent();
    event.payload = { event_type: 'test_event' }; // Minimal required payload
    
    // Act
    const response = await invokeFunction(event);
    
    // Assert
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.can_be_invoked).toBe(true);
  });

  // Test 6: Verify function handles modified event structure
  test('should handle modified event structure', async () => {
    // Arrange
    const event = createMinimalEvent();
    // Modify the event structure but keep required fields
    event.payload.custom_field = 'custom value';
    
    // Act
    const response = await invokeFunction(event);
    
    // Assert
    expect(response.function_result.can_be_invoked).toBe(true);
  });
});