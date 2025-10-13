import { 
  getTestEnvironment, 
  createBaseTestEvent, 
  setupCallbackServer, 
  teardownCallbackServer, 
  sendEventToSnapIn,
  startRateLimiting,
  endRateLimiting,
  CallbackServerSetup 
} from './test-utils';

describe('fetch_board_cards function conformance tests', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    await teardownCallbackServer(callbackServer);
  });

  describe('Trivial: Basic function invocation', () => {
    it('should successfully invoke fetch_board_cards with minimal valid payload', async () => {
      const event = createBaseTestEvent(testEnv);
      event.input_data.global_values.limit = '10';

      const response = await sendEventToSnapIn(event);

      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.error).toBeUndefined();
      
      const result = response.function_result;
      expect(result.status).toBeDefined();
      expect(result.status_code).toBeDefined();
      expect(result.api_delay).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.timestamp).toBeDefined();
    }, 30000);
  });

  describe('Simple: Required parameters only', () => {
    it('should fetch board cards with required limit parameter', async () => {
      const event = createBaseTestEvent(testEnv);
      event.input_data.global_values.limit = '5';

      const response = await sendEventToSnapIn(event);

      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.error).toBeUndefined();

      const result = response.function_result;
      expect(result.status).toBe('success');
      expect(result.status_code).toBe(200);
      expect(typeof result.api_delay).toBe('number');
      expect(result.message).toContain('Successfully retrieved board cards');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(Array.isArray(result.cards)).toBe(true);

      if (result.cards && result.cards.length > 0) {
        const card = result.cards[0];
        expect(card.id).toBeDefined();
        expect(card.name).toBeDefined();
        expect(typeof card.closed).toBe('boolean');
      }
    }, 30000);
  });

  describe('More Complex: Pagination with limit and before parameters', () => {
    it('should fetch board cards with both limit and before parameters', async () => {
      const event = createBaseTestEvent(testEnv);
      event.input_data.global_values.limit = '3';
      event.input_data.global_values.before = '68e8befc8381b0efa25ce1eb';

      const response = await sendEventToSnapIn(event);

      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.error).toBeUndefined();

      const result = response.function_result;
      expect(result.status).toBe('success');
      expect(result.status_code).toBe(200);
      expect(typeof result.api_delay).toBe('number');
      expect(result.message).toContain('Successfully retrieved board cards');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(Array.isArray(result.cards)).toBe(true);

      // Verify that the limit is respected (should have at most 3 cards)
      if (result.cards) {
        expect(result.cards.length).toBeLessThanOrEqual(3);
      }
    }, 30000);
  });

  describe('Edge Cases: Error handling', () => {
    it('should handle missing limit parameter gracefully', async () => {
      const event = createBaseTestEvent(testEnv);
      // Intentionally omit the limit parameter

      const response = await sendEventToSnapIn(event);

      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();

      const result = response.function_result;
      expect(result.status).toBe('failure');
      expect(result.status_code).toBe(500);
      expect(result.message).toContain('missing limit');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.cards).toBeUndefined();
    }, 30000);

    it('should handle invalid limit parameter gracefully', async () => {
      const event = createBaseTestEvent(testEnv);
      event.input_data.global_values.limit = 'invalid-limit';

      const response = await sendEventToSnapIn(event);

      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();

      const result = response.function_result;
      expect(result.status).toBe('failure');
      expect(result.status_code).toBe(500);
      expect(result.message).toContain('limit must be a positive integer');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.cards).toBeUndefined();
    }, 30000);

    it('should handle missing external_sync_unit_id gracefully', async () => {
      const event = createBaseTestEvent(testEnv);
      event.input_data.global_values.limit = '5';
      delete event.payload.event_context.external_sync_unit_id;

      const response = await sendEventToSnapIn(event);

      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();

      const result = response.function_result;
      expect(result.status).toBe('failure');
      expect(result.status_code).toBe(500);
      expect(result.message).toContain('missing external_sync_unit_id');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result.cards).toBeUndefined();
    }, 30000);
  });

  describe('Rate Limiting: API rate limit handling', () => {
    it('should handle rate limiting with proper status code and api_delay calculation', async () => {
      const testName = 'fetch_board_cards_rate_limit_test';
      
      try {
        // Step 1: Start rate limiting on the mock API server
        console.log(`Starting rate limiting test: ${testName}`);
        await startRateLimiting(testName);
        
        // Step 2: Create event with valid credentials and required parameters
        const event = createBaseTestEvent(testEnv);
        event.input_data.global_values.limit = '5';
        event.payload.event_context.external_sync_unit_id = '68e8befbf2f641caa9b1e275';
        
        console.log('Invoking fetch_board_cards function with rate limiting active', {
          boardId: event.payload.event_context.external_sync_unit_id,
          limit: event.input_data.global_values.limit,
          testName: testName
        });
        
        // Step 3: Invoke the function and expect rate limiting response
        const response = await sendEventToSnapIn(event);
        
        expect(response).toBeDefined();
        expect(response.function_result).toBeDefined();
        expect(response.error).toBeUndefined();
        
        const result = response.function_result;
        
        console.log('Rate limiting test response received', {
          status: result.status,
          status_code: result.status_code,
          api_delay: result.api_delay,
          message: result.message,
          testName: testName
        });
        
        // Step 4: Validate rate limiting behavior
        expect(result.status_code).toBe(429);
        expect(result.status_code).toBe(429); // Explicit assertion with descriptive message
        if (result.status_code !== 429) {
          throw new Error(`Expected status_code to be 429 (rate limited), but got ${result.status_code}. This indicates the rate limiting was not properly triggered or handled. Test: ${testName}`);
        }
        
        expect(typeof result.api_delay).toBe('number');
        expect(result.api_delay).toBeGreaterThan(0);
        expect(result.api_delay).toBeLessThanOrEqual(3);
        
        if (result.api_delay <= 0) {
          throw new Error(`Expected api_delay to be greater than 0, but got ${result.api_delay}. This indicates the rate limit delay was not properly calculated. Test: ${testName}`);
        }
        
        if (result.api_delay > 3) {
          throw new Error(`Expected api_delay to be <= 3 seconds, but got ${result.api_delay}. This suggests the api_delay calculation in the implementation is incorrect. Test: ${testName}`);
        }
        
        expect(result.message).toBeDefined();
        expect(typeof result.message).toBe('string');
        expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        
        // Cards should not be present in rate limited response
        expect(result.cards).toBeUndefined();
        
        console.log(`Rate limiting test completed successfully: ${testName}`, {
          status_code: result.status_code,
          api_delay: result.api_delay,
          message: result.message
        });
        
      } finally {
        // Step 5: Always end rate limiting, even if test fails
        try {
          console.log(`Ending rate limiting for test: ${testName}`);
          await endRateLimiting();
          console.log(`Rate limiting ended successfully for test: ${testName}`);
        } catch (endError) {
          console.error(`Failed to end rate limiting for test: ${testName}`, {
            error: endError instanceof Error ? endError.message : 'Unknown error',
            stack: endError instanceof Error ? endError.stack : undefined
          });
          // Don't throw here to avoid masking the original test failure
        }
      }
    }, 45000); // Increased timeout to account for rate limiting setup/teardown
  });

  describe('Acceptance Test: Specific board with exact limit', () => {
    it('should fetch exactly 10 cards from board 68e8befbf2f641caa9b1e275 with limit 10 and no before parameter', async () => {
      const event = createBaseTestEvent(testEnv);
      event.payload.event_context.external_sync_unit_id = '68e8befbf2f641caa9b1e275';
      event.input_data.global_values.limit = '10';
      // Explicitly ensure no 'before' parameter is set
      delete event.input_data.global_values.before;

      const response = await sendEventToSnapIn(event);

      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.error).toBeUndefined();

      const result = response.function_result;
      expect(result.status).toBe('success');
      expect(result.status_code).toBe(200);
      expect(typeof result.api_delay).toBe('number');
      expect(result.message).toContain('Successfully retrieved board cards');
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(Array.isArray(result.cards)).toBe(true);
      
      // The core acceptance test assertion: exactly 10 cards should be fetched
      expect(result.cards).toHaveLength(10);
      console.log(`Acceptance Test: Successfully fetched exactly ${result.cards?.length} cards as expected`);
    }, 30000);
  });

  describe('Acceptance Test: Specific pagination scenario', () => {
    it('should fetch exactly 2 cards from board 68e8befbf2f641caa9b1e275 with limit 10 and before 68e8befe476ee045f3879d92', async () => {
      const event = createBaseTestEvent(testEnv);
      event.payload.event_context.external_sync_unit_id = '68e8befbf2f641caa9b1e275';
      event.input_data.global_values.limit = '10';
      event.input_data.global_values.before = '68e8befe476ee045f3879d92';

      console.log('Acceptance Test Parameters:', {
        boardId: event.payload.event_context.external_sync_unit_id,
        limit: event.input_data.global_values.limit,
        before: event.input_data.global_values.before
      });

      const response = await sendEventToSnapIn(event);

      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.error).toBeUndefined();

      const result = response.function_result;
      expect(result.status).toBe('success');
      expect(result.status_code).toBe(200);
      expect(Array.isArray(result.cards)).toBe(true);
      
      // The core acceptance test assertion: exactly 2 cards should be fetched with the given pagination parameters
      expect(result.cards).toHaveLength(2);
      console.log(`Acceptance Test: Successfully fetched exactly ${result.cards?.length} cards as expected with pagination (before=${event.input_data.global_values.before})`);
    }, 30000);
  });

  describe('Acceptance Test: Specific card with attachment validation', () => {
    it('should fetch cards and validate specific card with "devrev cover" attachment', async () => {
      const event = createBaseTestEvent(testEnv);
      event.payload.event_context.external_sync_unit_id = '68e8befbf2f641caa9b1e275';
      event.input_data.global_values.limit = '10';
      event.input_data.global_values.before = '68e8befe476ee045f3879d92';

      console.log('Acceptance Test Parameters:', {
        boardId: event.payload.event_context.external_sync_unit_id,
        limit: event.input_data.global_values.limit,
        before: event.input_data.global_values.before
      });

      // Step 1: Test The Function "fetch_board_cards" with specified parameters
      const response = await sendEventToSnapIn(event);

      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.error).toBeUndefined();

      const apiResult = response.function_result;
      expect(apiResult.status).toBe('success');
      expect(apiResult.status_code).toBe(200);
      expect(Array.isArray(apiResult.cards)).toBe(true);
      
      console.log(`Step 1 Complete: Fetched ${apiResult.cards?.length || 0} cards from API`);

      // Step 2: Retrieve the card with ID "68e8befc8381b0efa25ce1eb"
      const targetCardId = '68e8befc8381b0efa25ce1eb';
      const card = apiResult.cards?.find((c: any) => c.id === targetCardId);
      
      expect(card).toBeDefined();
      expect(card).not.toBeNull();
      console.log(`Step 2 Complete: Found target card with ID ${targetCardId}`);
      console.log(`Card details:`, { id: card.id, name: card.name, attachments_count: card.attachments?.length || 0 });

      // Step 3: Find attachment with name "devrev cover"
      expect(Array.isArray(card.attachments)).toBe(true);
      const attachment = card.attachments?.find((att: any) => att.name === 'devrev cover');
      
      expect(attachment).toBeDefined();
      expect(attachment).not.toBeNull();
      console.log(`Step 3 Complete: Found attachment with name "devrev cover"`);
      console.log(`Attachment details:`, { id: attachment.id, name: attachment.name, url: attachment.url });
    }, 30000);
  });
});