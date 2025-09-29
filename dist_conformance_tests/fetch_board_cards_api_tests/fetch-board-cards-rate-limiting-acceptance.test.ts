import axios from 'axios';
import { Server } from 'http';
import { getTestEnvironment, createCallbackServer, createBaseEvent, TestEnvironment } from './test-utils';

describe('fetch_board_cards rate limiting acceptance test', () => {
  let callbackServer: Server;
  let env: TestEnvironment;
  const snapInServerUrl = 'http://localhost:8000/handle/sync';
  const rateLimitingServerUrl = 'http://localhost:8004';

  beforeAll(async () => {
    env = getTestEnvironment();
    const { server } = await createCallbackServer();
    callbackServer = server;
  });

  afterAll(async () => {
    if (callbackServer) {
      await new Promise<void>((resolve) => {
        callbackServer.close(() => {
          resolve();
        });
      });
    }
  });

  describe('Rate Limiting Behavior', () => {
    test('should handle rate limiting correctly with proper api_delay calculation', async () => {
      const testIdentifier = `fetch_board_cards_rate_limit_test_${Date.now()}`;
      
      console.log('=== RATE LIMITING ACCEPTANCE TEST ===');
      console.log(`Test Identifier: ${testIdentifier}`);
      
      try {
        // Step 1: Start rate limiting
        console.log('Step 1: Starting rate limiting on the mock server');
        console.log(`  Sending POST request to: ${rateLimitingServerUrl}/start_rate_limiting`);
        console.log(`  Request body: { "test_name": "${testIdentifier}" }`);
        
        const startRateLimitingResponse = await axios.post(`${rateLimitingServerUrl}/start_rate_limiting`, {
          test_name: testIdentifier
        });
        
        console.log(`  Rate limiting start response status: ${startRateLimitingResponse.status}`);
        console.log(`  Rate limiting start response data:`, startRateLimitingResponse.data);
        
        if (startRateLimitingResponse.status !== 200) {
          throw new Error(`Failed to start rate limiting. Expected status 200, got ${startRateLimitingResponse.status}`);
        }
        
        console.log('Step 1: COMPLETED - Rate limiting started successfully');

        // Step 2: Invoke the function with valid credentials and parameters
        console.log('Step 2: Invoking fetch_board_cards function');
        
        const event = createBaseEvent(env, { limit: '10' });
        event.payload.event_context.external_sync_unit_id = '688725dad59c015ce052eecf';
        event.payload.event_context.external_sync_unit = '688725dad59c015ce052eecf';
        
        console.log(`  Board ID: ${event.payload.event_context.external_sync_unit_id}`);
        console.log(`  Limit: ${event.input_data.global_values.limit}`);
        console.log(`  API Key: ${env.trelloApiKey.substring(0, 8)}...`);
        console.log(`  Token: ${env.trelloToken.substring(0, 8)}...`);
        console.log(`  Sending POST request to: ${snapInServerUrl}`);
        
        const functionResponse = await axios.post(snapInServerUrl, event);
        
        console.log(`  Function response status: ${functionResponse.status}`);
        
        if (functionResponse.status !== 200) {
          throw new Error(`Function call failed. Expected status 200, got ${functionResponse.status}`);
        }
        
        expect(functionResponse.status).toBe(200);
        expect(functionResponse.data.function_result).toBeDefined();
        
        const functionResult = functionResponse.data.function_result;
        console.log(`  Function result status_code: ${functionResult.status_code}`);
        console.log(`  Function result api_delay: ${functionResult.api_delay}`);
        console.log(`  Function result message: ${functionResult.message}`);
        
        console.log('Step 2: COMPLETED - Function invoked successfully');

        // Step 3: Verify rate limiting response
        console.log('Step 3: Verifying rate limiting behavior');
        
        // Verify status_code = 429
        console.log(`  Expected status_code: 429`);
        console.log(`  Actual status_code: ${functionResult.status_code}`);
        
        if (functionResult.status_code !== 429) {
          console.error(`STEP 3 FAILED: Expected status_code to be 429 (rate limited) but got ${functionResult.status_code}`);
          console.error(`  This indicates that either:`);
          console.error(`    1. The rate limiting was not properly activated on the mock server`);
          console.error(`    2. The function is not correctly handling the 429 response from the API`);
          console.error(`    3. The function is not making the expected API call to the rate-limited endpoint`);
          console.error(`  Function result details:`);
          console.error(`    - status_code: ${functionResult.status_code}`);
          console.error(`    - api_delay: ${functionResult.api_delay}`);
          console.error(`    - message: ${functionResult.message}`);
          throw new Error(`Step 3 failed: Expected status_code 429 but got ${functionResult.status_code}`);
        }
        
        expect(functionResult.status_code).toBe(429);
        console.log('  ✓ Status code validation passed');
        
        // Verify api_delay > 0 and api_delay <= 3
        console.log(`  Expected api_delay: > 0 and <= 3`);
        console.log(`  Actual api_delay: ${functionResult.api_delay}`);
        
        if (typeof functionResult.api_delay !== 'number') {
          console.error(`STEP 3 FAILED: api_delay is not a number`);
          console.error(`  Expected: number`);
          console.error(`  Actual type: ${typeof functionResult.api_delay}`);
          console.error(`  Actual value: ${functionResult.api_delay}`);
          throw new Error(`Step 3 failed: api_delay should be a number but got ${typeof functionResult.api_delay}`);
        }
        
        if (functionResult.api_delay <= 0) {
          console.error(`STEP 3 FAILED: api_delay should be greater than 0`);
          console.error(`  Expected: > 0`);
          console.error(`  Actual: ${functionResult.api_delay}`);
          console.error(`  This indicates that the function is not correctly calculating the delay from the Retry-After header`);
          throw new Error(`Step 3 failed: api_delay should be > 0 but got ${functionResult.api_delay}`);
        }
        
        if (functionResult.api_delay > 3) {
          console.error(`STEP 3 FAILED: api_delay should be <= 3 seconds`);
          console.error(`  Expected: <= 3`);
          console.error(`  Actual: ${functionResult.api_delay}`);
          console.error(`  This indicates a problem with api_delay calculation in the implementation code`);
          console.error(`  The function should parse the Retry-After header correctly and calculate the delay properly`);
          throw new Error(`Step 3 failed: api_delay should be <= 3 but got ${functionResult.api_delay}. This suggests incorrect api_delay calculation in the implementation.`);
        }
        
        expect(functionResult.api_delay).toBeGreaterThan(0);
        expect(functionResult.api_delay).toBeLessThanOrEqual(3);
        console.log('  ✓ API delay validation passed');
        
        // Verify that the message indicates rate limiting
        if (functionResult.message && !functionResult.message.toLowerCase().includes('rate limit')) {
          console.warn(`  Warning: Message does not mention rate limiting: "${functionResult.message}"`);
        }
        
        console.log('Step 3: COMPLETED - Rate limiting behavior verified');

      } finally {
        // Step 4: End rate limiting (always execute this in finally block)
        console.log('Step 4: Ending rate limiting on the mock server');
        
        try {
          console.log(`  Sending POST request to: ${rateLimitingServerUrl}/end_rate_limiting`);
          
          const endRateLimitingResponse = await axios.post(`${rateLimitingServerUrl}/end_rate_limiting`);
          
          console.log(`  Rate limiting end response status: ${endRateLimitingResponse.status}`);
          console.log(`  Rate limiting end response data:`, endRateLimitingResponse.data);
          
          if (endRateLimitingResponse.status !== 200) {
            console.error(`Warning: Failed to end rate limiting properly. Status: ${endRateLimitingResponse.status}`);
          } else {
            console.log('Step 4: COMPLETED - Rate limiting ended successfully');
          }
          
        } catch (endError) {
          console.error('Error ending rate limiting:', endError);
          console.error('This may cause issues with subsequent tests if rate limiting remains active');
        }
      }
      
      console.log('=== RATE LIMITING ACCEPTANCE TEST PASSED ===');
      console.log('Summary:');
      console.log(`  ✓ Step 1: Successfully started rate limiting for test "${testIdentifier}"`);
      console.log(`  ✓ Step 2: Successfully invoked fetch_board_cards function`);
      console.log(`  ✓ Step 3: Verified status_code = 429 and api_delay constraints`);
      console.log(`  ✓ Step 4: Successfully ended rate limiting`);
      
    }, 60000); // Extended timeout for rate limiting test

    test('should handle rate limiting cleanup even if main test fails', async () => {
      // This test ensures that rate limiting is properly cleaned up even if there are issues
      const testIdentifier = `fetch_board_cards_cleanup_test_${Date.now()}`;
      
      console.log('=== RATE LIMITING CLEANUP TEST ===');
      console.log(`Test Identifier: ${testIdentifier}`);
      
      // Start rate limiting
      await axios.post(`${rateLimitingServerUrl}/start_rate_limiting`, {
        test_name: testIdentifier
      });
      
      // Immediately end it to test cleanup
      const endResponse = await axios.post(`${rateLimitingServerUrl}/end_rate_limiting`);
      
      expect(endResponse.status).toBe(200);
      console.log('Rate limiting cleanup test completed successfully');
    }, 30000);
  });
});