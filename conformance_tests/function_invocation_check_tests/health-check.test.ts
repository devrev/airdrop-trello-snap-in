import { 
  createBasicFunctionInput, 
  sendRequestToSnapInServer, 
  setupCallbackServer, 
  closeCallbackServer 
} from './utils';
import { Server } from 'http';

describe('Health Check Function Conformance Tests', () => {
  let callbackServer: Server;
  let callbackData: any[];

  beforeAll(async () => {
    // Set up the callback server
    const { server, callbackData: data } = await setupCallbackServer();
    callbackServer = server;
    callbackData = data;
  });

  afterAll(async () => {
    // Close the callback server
    await closeCallbackServer(callbackServer);
  });

  beforeEach(() => {
    // Clear callback data before each test
    callbackData.length = 0;
  });

  test('Basic: Health check function responds successfully', async () => {
    // Create a basic function input
    const input = createBasicFunctionInput();
    
    // Send the request to the snap-in server
    const response = await sendRequestToSnapInServer(input);
    
    // Verify that we got a response
    expect(response).toBeDefined();
  });

  test('Input Validation: Health check function handles input correctly', async () => {
    // Create a function input with a specific request ID for tracing
    const requestId = `test-${Date.now()}`;
    const input = createBasicFunctionInput();
    input.execution_metadata.request_id = requestId;
    
    // Send the request to the snap-in server
    const response = await sendRequestToSnapInServer(input);
    
    // Verify that the response contains the function result
    expect(response).toHaveProperty('function_result');
    expect(response.error).toBeUndefined();
  });

  test('Response Structure: Health check function returns expected structure', async () => {
    // Create a basic function input
    const input = createBasicFunctionInput();
    
    // Send the request to the snap-in server
    const response = await sendRequestToSnapInServer(input);
    
    // Verify the structure of the function result
    expect(response).toHaveProperty('function_result');
    expect(response.function_result).toHaveProperty('status');
    expect(response.function_result).toHaveProperty('message');
    expect(response.function_result.status).toBe('success');
    expect(typeof response.function_result.message).toBe('string');
  });

  test('Error Handling: Health check function with invalid function name returns error', async () => {
    // Create a function input with an invalid function name
    const input = createBasicFunctionInput('non_existent_function');
    
    // Send the request to the snap-in server
    const response = await sendRequestToSnapInServer(input);
    
    // Verify that we got a response with an error property
    // The server handles invalid function names by returning a response with an error
    // rather than throwing an HTTP error
    expect(response).toBeDefined();
    expect(response).toHaveProperty('error');
    expect(response.function_result).toBeUndefined();
  });
});