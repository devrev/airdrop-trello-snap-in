import axios from 'axios';
import { setupTestEnvironment, createEventPayload, TestCredentials } from './test/runner';

describe('fetch_comments function tests', () => {
  let credentials: TestCredentials;
  const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
  const RATE_LIMIT_SERVER_URL = 'http://localhost:8004/start_rate_limiting';
  const TEST_CARD_ID = '68e8befc8381b0efa25ce1eb';

  beforeAll(() => {
    credentials = setupTestEnvironment();
  });

  /**
   * Test 1: fetch_comments_function_invocation_success
   * Validates that the fetch_comments function can be successfully invoked with valid credentials
   */
  test('fetch_comments_function_invocation_success', async () => {
    // Create event payload with card ID in input_data.global_values.idCard
    const eventPayload = createEventPayload({
      functionName: 'fetch_comments',
      connectionDataKey: `key=${credentials.apiKey}&token=${credentials.token}`,
      connectionDataOrgId: credentials.organizationId,
      inputData: {
        global_values: {
          idCard: TEST_CARD_ID,
        },
        event_sources: {},
      },
    });

    // Send request to snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, eventPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    // Verify response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data).not.toBeNull();
    expect(response.data.error).toBeUndefined();
  }, 30000);

  /**
   * Test 2: fetch_comments_response_structure
   * Verifies that the fetch_comments function returns a response with the correct structure
   */
  test('fetch_comments_response_structure', async () => {
    // Create event payload
    const eventPayload = createEventPayload({
      functionName: 'fetch_comments',
      connectionDataKey: `key=${credentials.apiKey}&token=${credentials.token}`,
      connectionDataOrgId: credentials.organizationId,
      inputData: {
        global_values: {
          idCard: TEST_CARD_ID,
        },
        event_sources: {},
      },
    });

    // Send request to snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, eventPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    // Verify HTTP status
    expect(response.status).toBe(200);

    // Verify function_result exists
    expect(response.data.function_result).toBeDefined();
    const functionResult = response.data.function_result;

    // Verify response structure
    expect(functionResult.status_code).toBe(200);
    expect(functionResult.api_delay).toBe(0);
    expect(functionResult.message).toBeDefined();
    expect(typeof functionResult.message).toBe('string');
    expect(functionResult.message.length).toBeGreaterThan(0);
    expect(Array.isArray(functionResult.data)).toBe(true);
  }, 30000);

  /**
   * Test 3: fetch_comments_returns_array_of_comments
   * Validates that the fetch_comments function returns an array of comment objects
   * with the correct format according to ObjectPRD specification
   */
  test('fetch_comments_returns_array_of_comments', async () => {
    // Create event payload
    const eventPayload = createEventPayload({
      functionName: 'fetch_comments',
      connectionDataKey: `key=${credentials.apiKey}&token=${credentials.token}`,
      connectionDataOrgId: credentials.organizationId,
      inputData: {
        global_values: {
          idCard: TEST_CARD_ID,
        },
        event_sources: {},
      },
    });

    // Send request to snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, eventPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    // Verify response structure
    expect(response.status).toBe(200);
    expect(response.data.function_result).toBeDefined();
    const functionResult = response.data.function_result;
    expect(functionResult.status_code).toBe(200);

    // Verify data is an array
    expect(Array.isArray(functionResult.data)).toBe(true);
    const comments = functionResult.data;

    // Validate each comment has the required fields according to ObjectPRD
    comments.forEach((comment: any, index: number) => {
      // id field - non-empty string
      expect(comment.id).toBeDefined();
      expect(typeof comment.id).toBe('string');
      expect(comment.id.length).toBeGreaterThan(0);

      // body field - array of strings (rich text format)
      expect(comment.body).toBeDefined();
      expect(Array.isArray(comment.body)).toBe(true);
      comment.body.forEach((line: any) => {
        expect(typeof line).toBe('string');
      });

      // parent_object_id field - string
      expect(comment.parent_object_id).toBeDefined();
      expect(typeof comment.parent_object_id).toBe('string');

      // created_by_id field - string
      expect(comment.created_by_id).toBeDefined();
      expect(typeof comment.created_by_id).toBe('string');

      // modified_date field - string
      expect(comment.modified_date).toBeDefined();
      expect(typeof comment.modified_date).toBe('string');

      // grandparent_object_id field - string
      expect(comment.grandparent_object_id).toBeDefined();
      expect(typeof comment.grandparent_object_id).toBe('string');

      // grandparent_object_type field - fixed value 'board'
      expect(comment.grandparent_object_type).toBeDefined();
      expect(comment.grandparent_object_type).toBe('board');

      // creator_display_name field - string
      expect(comment.creator_display_name).toBeDefined();
      expect(typeof comment.creator_display_name).toBe('string');

      // parent_object_type field - fixed value 'issue'
      expect(comment.parent_object_type).toBeDefined();
      expect(comment.parent_object_type).toBe('issue');
    });
  }, 30000);

  /**
   * Test 4: fetch_comments_acceptance_test_specific_card_validation
   * Acceptance test that validates specific comment data for card "68e8befc8381b0efa25ce1eb"
   * Verifies:
   * - Exactly 2 comments are returned
   * - Specific comment with ID "6904f1f01ce07384a79c0ee3" exists with correct field values
   */
  test('fetch_comments_acceptance_test_specific_card_validation', async () => {
    // Create event payload for specific card
    const eventPayload = createEventPayload({
      functionName: 'fetch_comments',
      connectionDataKey: `key=${credentials.apiKey}&token=${credentials.token}`,
      connectionDataOrgId: credentials.organizationId,
      inputData: {
        global_values: {
          idCard: TEST_CARD_ID,
        },
        event_sources: {},
      },
    });

    // Send request to snap-in server
    const response = await axios.post(SNAP_IN_SERVER_URL, eventPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    // Verify HTTP response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();

    const functionResult = response.data.function_result;

    // Verify successful status code
    expect(functionResult.status_code).toBe(200);
    expect(Array.isArray(functionResult.data)).toBe(true);

    const comments = functionResult.data;

    // ASSERTION 1: Verify exactly 2 comments are returned
    expect(comments.length).toBe(2);
    if (comments.length !== 2) {
      throw new Error(
        `Expected exactly 2 comments, but got ${comments.length}. ` +
        `Comments: ${JSON.stringify(comments, null, 2)}`
      );
    }

    // ASSERTION 2: Find specific comment with ID "6904f1f01ce07384a79c0ee3"
    const specificCommentId = '6904f1f01ce07384a79c0ee3';
    const specificComment = comments.find((c: any) => c.id === specificCommentId);

    expect(specificComment).toBeDefined();
    if (!specificComment) {
      throw new Error(
        `Comment with id '${specificCommentId}' not found in response. ` +
        `Available comment IDs: ${comments.map((c: any) => c.id).join(', ')}. ` +
        `Full response: ${JSON.stringify(comments, null, 2)}`
      );
    }

    // ASSERTION 3: Verify specific comment ID
    expect(specificComment.id).toBe(specificCommentId);

    // ASSERTION 4: Verify body field equals ["Second comment"]
    expect(Array.isArray(specificComment.body)).toBe(true);
    expect(specificComment.body).toEqual(['Second comment']);
    if (JSON.stringify(specificComment.body) !== JSON.stringify(['Second comment'])) {
      throw new Error(
        `Expected comment.body to be ["Second comment"], but got ${JSON.stringify(specificComment.body)}`
      );
    }

    // ASSERTION 5: Verify parent_object_id
    expect(specificComment.parent_object_id).toBe('68e8befc8381b0efa25ce1eb');

    // ASSERTION 6: Verify creator_display_name
    expect(specificComment.creator_display_name).toBe('examplesaas1');

    // ASSERTION 7: Verify grandparent_object_id
    expect(specificComment.grandparent_object_id).toBe('68e8befbf2f641caa9b1e275');

    // Log success for debugging
    console.log('Acceptance test passed: All assertions validated successfully');
  }, 30000);

  /**
   * Test 5: fetch_comments_rate_limiting_validation
   * Acceptance test that validates rate limiting behavior for fetch_comments function
   * Flow:
   * 1. Trigger rate limiting via test server
   * 2. Invoke fetch_comments function
   * 3. Verify status_code = 429
   * 4. Verify api_delay > 0 and api_delay <= 3
   */
  test('fetch_comments_rate_limiting_validation', async () => {
    const testName = 'fetch_comments_rate_limiting_validation';
    
    console.log(`[${testName}] Starting rate limiting test`);

    // STEP 1: Trigger rate limiting
    console.log(`[${testName}] Step 1: Triggering rate limiting at ${RATE_LIMIT_SERVER_URL}`);
    try {
      const rateLimitResponse = await axios.post(
        RATE_LIMIT_SERVER_URL,
        { test_name: testName },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );
      console.log(`[${testName}] Rate limiting triggered successfully. Status: ${rateLimitResponse.status}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[${testName}] Failed to trigger rate limiting: ${errorMsg}`);
      throw new Error(
        `Failed to trigger rate limiting at ${RATE_LIMIT_SERVER_URL}. ` +
        `Error: ${errorMsg}. ` +
        `Ensure the rate limiting server is running.`
      );
    }

    // STEP 2: Create event payload for fetch_comments
    console.log(`[${testName}] Step 2: Creating event payload for fetch_comments`);
    const eventPayload = createEventPayload({
      functionName: 'fetch_comments',
      connectionDataKey: `key=${credentials.apiKey}&token=${credentials.token}`,
      connectionDataOrgId: credentials.organizationId,
      inputData: {
        global_values: {
          idCard: TEST_CARD_ID,
        },
        event_sources: {},
      },
    });

    // STEP 3: Invoke fetch_comments function
    console.log(`[${testName}] Step 3: Invoking fetch_comments function at ${SNAP_IN_SERVER_URL}`);
    const response = await axios.post(SNAP_IN_SERVER_URL, eventPayload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    console.log(`[${testName}] Received response with HTTP status: ${response.status}`);

    // Verify HTTP response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.function_result).toBeDefined();

    const functionResult = response.data.function_result;

    // ASSERTION 1: Verify status_code = 429
    console.log(`[${testName}] Validating status_code = 429`);
    expect(functionResult.status_code).toBe(429);
    if (functionResult.status_code !== 429) {
      throw new Error(
        `Expected status_code to be 429 (rate limited), but got ${functionResult.status_code}. ` +
        `Full response: ${JSON.stringify(functionResult, null, 2)}`
      );
    }

    // ASSERTION 2: Verify api_delay > 0 and api_delay <= 3
    console.log(`[${testName}] Validating api_delay: ${functionResult.api_delay}`);
    expect(functionResult.api_delay).toBeGreaterThan(0);
    expect(functionResult.api_delay).toBeLessThanOrEqual(3);
    if (functionResult.api_delay <= 0 || functionResult.api_delay > 3) {
      throw new Error(
        `Expected api_delay to be > 0 and <= 3, but got ${functionResult.api_delay}. ` +
        `This indicates incorrect api_delay calculation in the implementation. ` +
        `Full response: ${JSON.stringify(functionResult, null, 2)}`
      );
    }

    console.log(`[${testName}] Rate limiting test passed successfully. api_delay: ${functionResult.api_delay}`);
  }, 30000);
});