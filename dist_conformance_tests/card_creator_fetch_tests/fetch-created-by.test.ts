import { getTestEnvironment, setupCallbackServer, createBaseTestEvent, callSnapInFunction, CallbackServerSetup } from './test-utils';
import axios from 'axios';

describe('fetch_created_by function', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer) {
      await callbackServer.cleanup();
    }
  });

  describe('Basic Function Invocation', () => {
    it('should be invokable without throwing errors', async () => {
      const event = createBaseTestEvent(testEnv);
      event.input_data.global_values.idCard = '68e8befc8381b0efa25ce1eb';

      const response = await callSnapInFunction('fetch_created_by', event);
      
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(typeof response.function_result.status).toBe('string');
      expect(typeof response.function_result.status_code).toBe('number');
      expect(typeof response.function_result.api_delay).toBe('number');
      expect(typeof response.function_result.message).toBe('string');
      expect(typeof response.function_result.timestamp).toBe('string');
    });
  });

  describe('Input Validation', () => {
    it('should fail when idCard is missing', async () => {
      const event = createBaseTestEvent(testEnv);
      // Intentionally not setting idCard

      const response = await callSnapInFunction('fetch_created_by', event);
      
      expect(response.function_result.status).toBe('failure');
      expect(response.function_result.status_code).toBe(500);
      expect(response.function_result.message).toContain('missing idCard');
    });

    it('should fail when global_values is missing', async () => {
      const event = createBaseTestEvent(testEnv);
      delete event.input_data.global_values;

      const response = await callSnapInFunction('fetch_created_by', event);
      
      expect(response.function_result.status).toBe('failure');
      expect(response.function_result.status_code).toBe(500);
      expect(response.function_result.message).toContain('missing global_values');
    });

    it('should fail when input_data is missing', async () => {
      const event = createBaseTestEvent(testEnv);
      delete event.input_data;

      const response = await callSnapInFunction('fetch_created_by', event);
      
      expect(response.function_result.status).toBe('failure');
      expect(response.function_result.status_code).toBe(500);
      expect(response.function_result.message).toContain('missing input_data');
    });
  });

  describe('Successful Card Creator Fetch', () => {
    it('should successfully fetch card creator ID', async () => {
      const event = createBaseTestEvent(testEnv);
      event.input_data.global_values.idCard = '68e8befc8381b0efa25ce1eb';

      const response = await callSnapInFunction('fetch_created_by', event);
      
      expect(response.function_result.status).toBe('success');
      expect(response.function_result.status_code).toBe(200);
      expect(response.function_result.creator_id).toBeDefined();
      expect(typeof response.function_result.creator_id).toBe('string');
      expect(response.function_result.creator_id.length).toBeGreaterThan(0);
      expect(response.function_result.message).toContain('Successfully retrieved card creator ID');
    });
  });

  describe('API Error Handling', () => {
    it('should handle invalid card ID gracefully', async () => {
      const event = createBaseTestEvent(testEnv);
      event.input_data.global_values.idCard = 'invalid-card-id';

      const response = await callSnapInFunction('fetch_created_by', event);
      
      expect(response.function_result.status).toBe('failure');
      expect(response.function_result.status_code).toBeGreaterThanOrEqual(400);
      expect(response.function_result.api_delay).toBeGreaterThanOrEqual(0);
      expect(response.function_result.message).toBeDefined();
    });

    it('should handle authentication errors', async () => {
      const event = createBaseTestEvent(testEnv);
      event.input_data.global_values.idCard = '68e8befc8381b0efa25ce1eb';
      // Use invalid credentials
      event.payload.connection_data.key = 'key=invalid&token=invalid';

      const response = await callSnapInFunction('fetch_created_by', event);
      
      expect(response.function_result.status).toBe('failure');
      expect(response.function_result.status_code).toBe(401);
      expect(response.function_result.message).toContain('Authentication failed');
    });
  });

  describe('Acceptance Test', () => {
    it('should return creator ID "6752eb529b14a3446b75e69c" for card ID "68e8befc8381b0efa25ce1eb"', async () => {
      const event = createBaseTestEvent(testEnv);
      event.input_data.global_values.idCard = '68e8befc8381b0efa25ce1eb';

      const response = await callSnapInFunction('fetch_created_by', event);
      
      expect(response.function_result.status).toBe('success');
      expect(response.function_result.status_code).toBe(200);
      expect(response.function_result.creator_id).toBeDefined();
      expect(response.function_result.creator_id).toBe('6752eb529b14a3446b75e69c');
      expect(response.function_result.message).toContain('Successfully retrieved card creator ID');
    }, 30000); // 30 second timeout for this specific test
  });

  describe('Rate Limiting Test', () => {
    it('should handle rate limiting correctly with status_code 429 and proper api_delay', async () => {
      const testIdentifier = `fetch_created_by_rate_limit_${Date.now()}`;
      
      try {
        // Step 1: Start rate limiting
        console.log(`Starting rate limiting test with identifier: ${testIdentifier}`);
        const startResponse = await axios.post('http://localhost:8004/start_rate_limiting', {
          test_name: testIdentifier
        }, { timeout: 10000 });
        
        expect(startResponse.status).toBe(200);
        console.log('Rate limiting started successfully');

        // Step 2: Invoke the function with valid credentials and parameters
        const event = createBaseTestEvent(testEnv);
        event.input_data.global_values.idCard = '68e8befc8381b0efa25ce1eb';
        
        console.log('Invoking fetch_created_by function during rate limiting');
        const functionResponse = await callSnapInFunction('fetch_created_by', event);
        
        // Step 3: Verify rate limiting response
        console.log('Function response:', JSON.stringify(functionResponse.function_result, null, 2));
        
        expect(functionResponse.function_result.status_code).toBe(429);
        if (functionResponse.function_result.status_code !== 429) {
          throw new Error(`Expected status_code to be 429 but got ${functionResponse.function_result.status_code}. Response: ${JSON.stringify(functionResponse.function_result)}`);
        }
        
        expect(functionResponse.function_result.api_delay).toBeGreaterThan(0);
        expect(functionResponse.function_result.api_delay).toBeLessThanOrEqual(3);
        if (functionResponse.function_result.api_delay <= 0 || functionResponse.function_result.api_delay > 3) {
          throw new Error(`Expected api_delay to be > 0 and <= 3 but got ${functionResponse.function_result.api_delay}. This may indicate incorrect api_delay calculation in the implementation.`);
        }
        
        console.log(`Rate limiting test passed: status_code=${functionResponse.function_result.status_code}, api_delay=${functionResponse.function_result.api_delay}`);
        
      } finally {
        // Step 4: End rate limiting (cleanup)
        try {
          console.log('Ending rate limiting');
          await axios.post('http://localhost:8004/end_rate_limiting', {}, { timeout: 10000 });
          console.log('Rate limiting ended successfully');
        } catch (cleanupError) {
          console.error('Failed to end rate limiting during cleanup:', cleanupError);
        }
      }
    }, 30000); // 30 second timeout for this test
  });
});