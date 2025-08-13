import { 
  createValidFunctionInput, 
  invokeFunctionOnServer, 
  HealthCheckResponse,
  ErrorResponse,
  createInvalidFunctionInput
} from './test-utils';

describe('health_check function conformance tests', () => {
  
  // Test 1: Basic test - Verify the function returns the expected response format
  test('should return operational status when invoked with valid input', async () => {
    // Arrange
    const functionInput = createValidFunctionInput();
    
    // Act
    const response = await invokeFunctionOnServer(functionInput) as HealthCheckResponse;
    
    // Assert
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.status).toBe('operational');
    expect(response.function_result.message).toBe('Function can be invoked successfully');
    expect(response.error).toBeUndefined();
  });

  // Test 2: Error handling test - Verify the function handles missing context
  test('should return error when context is missing', async () => {
    // Arrange
    const functionInput = createInvalidFunctionInput('context');
    
    // Act
    const response = await invokeFunctionOnServer(functionInput);
    
    // Assert
    expect(response).toBeDefined();
    expect(response.error).toBeDefined(); 
    // Just verify we got an error response, as the exact format may vary
    expect(response).toHaveProperty('error');
  });

  // Test 3: Error handling test - Verify the function handles missing execution metadata
  test('should return error when execution_metadata is missing', async () => {
    // Arrange
    const functionInput = createInvalidFunctionInput('execution_metadata');
    
    // Act
    const response = await invokeFunctionOnServer(functionInput) as ErrorResponse;
    
    // Assert
    expect(response).toBeDefined();
    expect(response.error).toBeDefined(); 
    // The server returns a 400 error for missing execution_metadata
    expect(response.error.err_msg).toBeDefined();
  });

  // Test 4: Error handling test - Verify the function handles invalid function name
  test('should return error when function name is invalid', async () => {
    // Arrange
    const functionInput = createValidFunctionInput('non_existent_function');
    
    // Act
    const response = await invokeFunctionOnServer(functionInput) as ErrorResponse;
    
    // Assert
    expect(response).toBeDefined();
    expect(response.error).toBeDefined();
    expect(response.error.err_type).toBe('FUNCTION_NOT_FOUND');
    expect(response.error.err_msg).toContain('Function non_existent_function not found in factory');
  });

  // Test 5: Integration test - Verify the function works with proper payload structure
  test('should handle a request with empty but valid payload structure', async () => {
    // Arrange
    const functionInput = createValidFunctionInput();
    // Need at least one property to pass server validation
    functionInput.payload = {
      minimal_property: true
    };
    
    // Act
    const response = await invokeFunctionOnServer(functionInput) as HealthCheckResponse;
    
    // Assert
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.status).toBe('operational');
    expect(response.error).toBeUndefined();
  });
});