import { CallbackServer } from './callback-server';
import { callSnapInFunction } from './test-utils';

describe('can_push_data function tests', () => {
  let callbackServer: CallbackServer;

  beforeAll(async () => {
    // Start the callback server before all tests
    callbackServer = new CallbackServer({ port: 8002 });
    await callbackServer.start();
  });

  afterAll(async () => {
    // Stop the callback server after all tests
    await callbackServer.stop();
  });

  beforeEach(() => {
    // Reset the callback server state before each test
    callbackServer.reset();
    callbackServer.setResponseStatus(200);
    callbackServer.setResponseDelay(0);
  });

  test('Basic connectivity - function can be called', async () => {
    // Test that the function can be called with minimal parameters
    const result = await callSnapInFunction('can_push_data', {});
    
    // Verify the function returns a response (even if it indicates failure)
    expect(result).toBeDefined();
    expect(result.function_result).toBeDefined();
    expect(result.function_result.can_push).toBeDefined();
    expect(typeof result.function_result.message).toBe('string');
  });

  test('Missing callback URL - should return appropriate error', async () => {
    // Test with missing callback URL
    const result = await callSnapInFunction('can_push_data', {});
    
    // Verify the function correctly identifies missing callback URL
    expect(result.function_result.can_push).toBe(false);
    expect(result.function_result.message).toContain('Missing callback URL');
  });

  test('Valid callback URL - should successfully push data', async () => {
    // Test with valid callback URL
    const callbackUrl = 'http://localhost:8002/valid-callback';
    const result = await callSnapInFunction('can_push_data', { callback_url: callbackUrl });
    
    // Verify the function reports success
    expect(result.function_result.can_push).toBe(true);
    expect(result.function_result.message).toContain('Successfully pushed data');
    
    // Verify the callback server received the data
    expect(callbackServer.getCallCount()).toBe(1);
    
    const receivedData = callbackServer.getLastReceivedData();
    expect(receivedData).toBeDefined();
    expect(receivedData?.test_data).toBe('This is a test payload');
    expect(receivedData?.timestamp).toBeDefined();
  });

  test('Invalid callback URL - should return appropriate error', async () => {
    // Test with invalid callback URL (non-existent port)
    const callbackUrl = 'http://localhost:9999/invalid-callback';
    const result = await callSnapInFunction('can_push_data', { callback_url: callbackUrl });
    
    // Verify the function reports failure
    expect(result.function_result.can_push).toBe(false);
    expect(result.function_result.message).toContain('Error pushing data');
    
    // Verify the callback server was not called
    expect(callbackServer.getCallCount()).toBe(0);
  });

  test('Callback server error - should handle error response', async () => {
    // Configure callback server to return an error
    callbackServer.setResponseStatus(500);
    
    // Test with valid callback URL but server returns error
    const callbackUrl = 'http://localhost:8002/error-callback';
    const result = await callSnapInFunction('can_push_data', { callback_url: callbackUrl });
    
    // Verify the function reports failure
    expect(result.function_result.can_push).toBe(false);
    expect(result.function_result.message).toContain('Error pushing data');
    
    // Verify the callback server was called
    expect(callbackServer.getCallCount()).toBe(1);
  });

  test('Callback server timeout - should handle timeout', async () => {
    // Configure callback server to delay response
    callbackServer.setResponseDelay(15000); // 15 seconds delay (longer than axios timeout)
    
    // Test with valid callback URL but server times out
    const callbackUrl = 'http://localhost:8002/timeout-callback';
    const result = await callSnapInFunction('can_push_data', { callback_url: callbackUrl });
    
    // Verify the function reports failure
    expect(result.function_result.can_push).toBe(false);
    expect(result.function_result.message).toContain('Error pushing data');
    
    // Verify the callback server was called
    expect(callbackServer.getCallCount()).toBe(1);
  });
});