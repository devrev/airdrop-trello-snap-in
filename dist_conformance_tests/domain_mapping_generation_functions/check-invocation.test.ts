import { createBaseEventPayload, sendRequestToSnapIn, setupCallbackServer } from './utils/test-utils';

describe('Check Invocation Function Tests', () => {
  let callbackServer: any;
  
  beforeAll(() => {
    // Setup callback server
    callbackServer = setupCallbackServer();
  });
  
  afterAll(() => {
    // Close callback server
    if (callbackServer && callbackServer.server) {
      callbackServer.server.close();
    }
  });
  
  it('should successfully invoke the check_invocation function', async () => {
    // Create event payload
    const eventPayload = createBaseEventPayload();
    
    // Send request to snap-in server
    const response = await sendRequestToSnapIn('check_invocation', eventPayload);
    
    // Validate response
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.can_be_invoked).toBe(true);
    expect(response.function_result.message).toBe('Function can be invoked successfully');
  });
});