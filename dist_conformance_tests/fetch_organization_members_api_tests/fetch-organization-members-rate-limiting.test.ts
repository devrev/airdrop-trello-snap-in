import axios from 'axios';
import {
  getTestEnvironment,
  setupCallbackServer,
  teardownServers,
  callSnapInFunction,
  TestServers,
} from './test-utils';
import testEventPayload from './test-event-payload.json';

describe('fetch_organization_members function - Rate Limiting', () => {
  let servers: TestServers;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    servers = await setupCallbackServer();
  });

  afterAll(async () => {
    await teardownServers(servers);
  });

  function createTestEvent(overrides: any = {}) {
    const event = JSON.parse(JSON.stringify(testEventPayload));
    
    // Replace placeholders with actual credentials
    event.payload.connection_data.key = event.payload.connection_data.key
      .replace('TRELLO_API_KEY', testEnv.TRELLO_API_KEY)
      .replace('TRELLO_TOKEN', testEnv.TRELLO_TOKEN);
    event.payload.connection_data.org_id = event.payload.connection_data.org_id
      .replace('TRELLO_ORGANIZATION_ID', testEnv.TRELLO_ORGANIZATION_ID);

    // Apply any overrides
    return { ...event, ...overrides };
  }

  describe('Rate Limiting: API rate limit handling', () => {
    it('should handle rate limiting correctly with proper api_delay calculation', async () => {
      const testName = 'fetch_organization_members_rate_limiting_test';
      
      try {
        // Step 1: Start rate limiting
        console.log('Starting rate limiting for test:', testName);
        const startRateLimitingResponse = await axios.post(
          'http://localhost:8004/start_rate_limiting',
          { test_name: testName },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
          }
        );
        
        expect(startRateLimitingResponse.status).toBe(200);
        console.log('Rate limiting started successfully');

        // Step 2: Invoke the function with valid credentials
        const event = createTestEvent();
        console.log('Calling fetch_organization_members function with rate limiting active');
        
        const response = await callSnapInFunction('fetch_organization_members', event);
        
        console.log('Function response:', JSON.stringify(response.function_result, null, 2));

        // Step 3: Verify rate limiting response
        expect(response).toBeDefined();
        expect(response.function_result).toBeDefined();
        
        // Verify status_code is 429 (Too Many Requests)
        expect(response.function_result.status_code).toBe(429);
        if (response.function_result.status_code !== 429) {
          throw new Error(
            `Expected status_code to be 429 (rate limited), but got ${response.function_result.status_code}. ` +
            `Response message: ${response.function_result.message}`
          );
        }

        // Verify api_delay is greater than 0 and less than or equal to 3
        expect(typeof response.function_result.api_delay).toBe('number');
        expect(response.function_result.api_delay).toBeGreaterThan(0);
        expect(response.function_result.api_delay).toBeLessThanOrEqual(3);
        
        if (response.function_result.api_delay <= 0) {
          throw new Error(
            `Expected api_delay to be greater than 0, but got ${response.function_result.api_delay}. ` +
            `This indicates the rate limiting delay was not properly calculated.`
          );
        }
        
        if (response.function_result.api_delay > 3) {
          throw new Error(
            `Expected api_delay to be <= 3 seconds, but got ${response.function_result.api_delay}. ` +
            `This suggests the api_delay calculation in the implementation may be incorrect.`
          );
        }

        // Verify message indicates rate limiting
        expect(response.function_result.message).toBeDefined();
        expect(typeof response.function_result.message).toBe('string');
        expect(response.function_result.message.toLowerCase()).toContain('rate limit');
        
        console.log(`Rate limiting handled correctly: status_code=${response.function_result.status_code}, api_delay=${response.function_result.api_delay}`);

      } finally {
        // Step 4: Always end rate limiting, even if test fails
        try {
          console.log('Ending rate limiting');
          const endRateLimitingResponse = await axios.post(
            'http://localhost:8004/end_rate_limiting',
            {},
            {
              headers: { 'Content-Type': 'application/json' },
              timeout: 10000,
            }
          );
          expect(endRateLimitingResponse.status).toBe(200);
          console.log('Rate limiting ended successfully');
        } catch (endError) {
          console.error('Failed to end rate limiting:', endError);
          throw new Error(
            `Failed to properly end rate limiting: ${endError instanceof Error ? endError.message : String(endError)}. ` +
            `This may affect subsequent tests.`
          );
        }
      }
    }, 60000);
  });
});