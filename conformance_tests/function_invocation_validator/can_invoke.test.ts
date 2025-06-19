import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';

// Constants
const TEST_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;

// Setup callback server
let callbackServer: any;

beforeAll(() => {
  // Create and start the callback server
  const app = express();
  app.use(bodyParser.json());
  
  // Add a route to handle callbacks
  app.post('/callback', (req, res) => {
    console.log('Received callback:', req.body);
    res.status(200).send({ status: 'ok' });
  });
  
  // Start the server
  return new Promise<void>((resolve) => {
    callbackServer = app.listen(CALLBACK_SERVER_PORT, () => {
      console.log(`Callback server running at http://localhost:${CALLBACK_SERVER_PORT}`);
      resolve();
    });
  });
});

afterAll(() => {
  // Close the callback server
  return new Promise<void>((resolve) => {
    callbackServer?.close(() => {
      resolve();
    });
  });
});

// Helper function to create a valid event payload
function createEventPayload(overrides = {}) {
  return {
    execution_metadata: {
      function_name: 'can_invoke',
      event_type: 'test_event',
      devrev_endpoint: 'http://localhost:8003'
    },
    context: {
      snap_in_id: 'test-snap-in-id',
      secrets: {
        service_account_token: 'test-token',
      },
    },
    payload: {
    },
    ...overrides,
  };
}

// Helper function to invoke the function via the test server
async function invokeFunction(payload: any) {
  try {
    const response = await axios.post(TEST_SERVER_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // If the response contains an error object, we should handle it appropriately
    // but not throw an exception since the HTTP request itself succeeded
    if (response.data && response.data.error) {
      return response.data;
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(`Server responded with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

describe('can_invoke function', () => {
  // Test 1: Basic functionality - verify the function can be invoked successfully
  test('should successfully invoke the function and return success response', async () => {
    // Arrange
    const payload = createEventPayload();
    
    // Act
    const result = await invokeFunction(payload);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(true);
    expect(result.function_result.message).toBe('Function can be invoked successfully');
    expect(result.error).toBeUndefined();
  });

  // Test 2: Error handling - verify the function handles missing function name
  test('should return an error when function name is not provided', async () => {
    // Arrange
    const invalidPayload = {
      execution_metadata: {
        // Missing function_name
        event_type: 'test_event',
        devrev_endpoint: 'http://localhost:8003'
      },
      context: {},
      payload: {},
    };
    
    // Act & Assert - expect the request to fail with an error about function name
    const result = await invokeFunction(invalidPayload);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.error).toBeDefined();
    expect(result.error.err_type).toBe('FUNCTION_NAME_NOT_PROVIDED');
    expect(result.error.err_msg).toContain('Function name not provided');
   });

  // Test 3: Error handling - verify the function handles incorrect function name
  test('should return an error when an incorrect function name is provided', async () => {
    // Arrange
    const payload = createEventPayload({
      execution_metadata: {
        function_name: 'non_existent_function', // Incorrect function name
        event_type: 'test_event',
        devrev_endpoint: 'http://localhost:8003'
      },
    });
    
    // Act
    const result = await invokeFunction(payload);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.error).toBeDefined();
    expect(result.error.err_type).toBe('FUNCTION_NOT_FOUND');
    expect(result.error.err_msg).toContain('non_existent_function');
  });

  // Test 4: Edge case - minimal valid input
  test('should handle minimal valid input', async () => {
    // Arrange
    const minimalPayload = {
      execution_metadata: {
        function_name: 'can_invoke',
      }, 
      context: {},
      payload: {},
    };
    
    // Act
    const result = await invokeFunction(minimalPayload);
    
    // Assert
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});