import { Server } from 'http';
import {
  getCredentialsFromEnv,
  createFetchUsersEventPayload,
  setupCallbackServer,
  teardownCallbackServer,
  invokeSnapInFunction,
  CallbackServerSetup,
} from './test-helpers';

describe('fetch_users function conformance tests', () => {
  let callbackServerSetup: CallbackServerSetup;
  let credentials: ReturnType<typeof getCredentialsFromEnv>;

  beforeAll(async () => {
    // Setup callback server
    callbackServerSetup = await setupCallbackServer(8002);

    // Get credentials from environment
    credentials = getCredentialsFromEnv();
  });

  afterAll(async () => {
    // Teardown callback server
    if (callbackServerSetup?.server) {
      await teardownCallbackServer(callbackServerSetup.server);
    }
  });

  describe('Test 1: fetch_users_function_invocation_success', () => {
    it('should successfully invoke fetch_users function with valid credentials', async () => {
      // Create event payload with valid credentials
      const eventPayload = createFetchUsersEventPayload(credentials);

      // Invoke the snap-in function
      const response = await invokeSnapInFunction('fetch_users', eventPayload);

      // Verify HTTP 200 response status
      expect(response.status).toBe(200);

      // Verify presence of response data
      expect(response.data).toBeDefined();
      expect(response.data).not.toBeNull();

      // Verify absence of error fields in the response
      expect(response.data.error).toBeUndefined();
    }, 60000);
  });

  describe('Test 2: fetch_users_response_structure', () => {
    it('should return response with correct structure and required fields', async () => {
      // Create event payload
      const eventPayload = createFetchUsersEventPayload(credentials);

      // Invoke the snap-in function
      const response = await invokeSnapInFunction('fetch_users', eventPayload);

      // Verify HTTP 200 status code
      expect(response.status).toBe(200);

      // Verify presence of function_result object
      expect(response.data.function_result).toBeDefined();
      expect(typeof response.data.function_result).toBe('object');

      const functionResult = response.data.function_result;

      // Verify status_code field set to 200
      expect(functionResult.status_code).toBe(200);

      // Verify api_delay field set to 0 (indicating no rate limiting)
      expect(functionResult.api_delay).toBe(0);

      // Verify message field as a non-empty string
      expect(functionResult.message).toBeDefined();
      expect(typeof functionResult.message).toBe('string');
      expect(functionResult.message.length).toBeGreaterThan(0);

      // Verify data field containing the users array
      expect(functionResult.data).toBeDefined();
      expect(Array.isArray(functionResult.data)).toBe(true);
    }, 60000);
  });

  describe('Test 3: fetch_users_returns_array_of_users', () => {
    it('should return array of users with correct format according to ObjectPRD', async () => {
      // Create event payload
      const eventPayload = createFetchUsersEventPayload(credentials);

      // Invoke the snap-in function
      const response = await invokeSnapInFunction('fetch_users', eventPayload);

      // Verify response structure
      expect(response.status).toBe(200);
      expect(response.data.function_result).toBeDefined();

      const functionResult = response.data.function_result;
      const users = functionResult.data;

      // Verify data field is an array
      expect(Array.isArray(users)).toBe(true);

      // Verify array is not empty
      expect(users.length).toBeGreaterThan(0);

      // Verify each user object contains required fields
      users.forEach((user: any, index: number) => {
        // Verify id field (string)
        expect(user.id).toBeDefined();
        expect(typeof user.id).toBe('string');
        expect(user.id.length).toBeGreaterThan(0);

        // Verify full_name field (string)
        expect(user.full_name).toBeDefined();
        expect(typeof user.full_name).toBe('string');

        // Verify username field (string)
        expect(user.username).toBeDefined();
        expect(typeof user.username).toBe('string');
        expect(user.username.length).toBeGreaterThan(0);

        // Verify email field (string)
        expect(user.email).toBeDefined();
        expect(typeof user.email).toBe('string');
      });
    }, 60000);
  });
});