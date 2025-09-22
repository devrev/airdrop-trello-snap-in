import { Server } from 'http';
import {
  createCallbackServer,
  sendEventToSnapInServer,
  replaceCredentialsInPayload,
  controlRateLimiting
} from './utils';

// Import event template
import eventTemplate from './event-template.json';

describe('fetch_organization_members rate limiting', () => {
  let callbackServer: Server;
  let callbackPromise: Promise<any>;
  const TEST_NAME = 'fetch_organization_members_rate_limit_test';
  
  beforeEach(async () => {
    // Set up the callback server before each test
    const serverSetup = await createCallbackServer();
    callbackServer = serverSetup.server;
    callbackPromise = serverSetup.callbackPromise;
  });
  
  afterEach(async () => {
    // Clean up the callback server after each test
    if (callbackServer) {
      callbackServer.close();
    }
    
    // Ensure rate limiting is turned off after the test
    try {
      await controlRateLimiting('end', TEST_NAME);
    } catch (error) {
      console.warn('Failed to end rate limiting, but continuing cleanup:', error);
    }
  });

  test('should handle rate limiting correctly', async () => {
    try {
      // Start rate limiting for this test
      await controlRateLimiting('start', TEST_NAME);
      
      // Prepare the event with credentials
      const event = replaceCredentialsInPayload(eventTemplate);
      
      // Override function name to ensure we're calling fetch_organization_members
      event.execution_metadata.function_name = 'fetch_organization_members';
      
      // Send the event to the snap-in server
      const response = await sendEventToSnapInServer(event);
      
      // Log the response for debugging
      console.log('Rate limiting test response:', JSON.stringify(response, null, 2));
      
      // Verify the response structure
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      
      // Verify rate limiting response
      expect(response.function_result.status_code).toBe(429, 
        );
      
      expect(response.function_result.api_delay).toBeGreaterThan(0, 
        );
      
      expect(response.function_result.api_delay).toBeLessThanOrEqual(3, 
        );
      
      // Verify error message contains rate limit information
      expect(response.function_result.message).toContain('Rate limit', 
        );
      
      // Verify success flag is false
      expect(response.function_result.success).toBe(false, 
        );
      
    } finally {
      // End rate limiting for this test
      await controlRateLimiting('end', TEST_NAME);
    }
  });
});