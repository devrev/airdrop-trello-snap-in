import { Server } from 'http';
import {
  getCredentialsFromEnv,
  createFetchUsersEventPayload,
  setupCallbackServer,
  teardownCallbackServer,
  invokeSnapInFunction,
  CallbackServerSetup,
} from './test-helpers';

describe('fetch_users function acceptance tests', () => {
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

  describe('Test 1: fetch_users_returns_exactly_three_users_with_specific_user_data', () => {
    it('should return exactly 3 users and validate specific user properties', async () => {
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

      // Verify function_result exists
      expect(response.data.function_result).toBeDefined();
      expect(typeof response.data.function_result).toBe('object');

      const functionResult = response.data.function_result;

      // Verify status_code is 200
      expect(functionResult.status_code).toBe(
        200,
        `Expected status_code to be 200, but got ${functionResult.status_code}`
      );

      // Verify data field exists and is an array
      expect(functionResult.data).toBeDefined();
      expect(Array.isArray(functionResult.data)).toBe(
        true,
        'Expected data field to be an array'
      );

      const users = functionResult.data;

      // Verify exactly 3 users are returned
      expect(users.length).toBe(
        3,
        `Expected exactly 3 users to be returned, but got ${users.length} users. User IDs: ${users.map((u: any) => u.id).join(', ')}`
      );

      // Find the specific user with ID "6752eb529b14a3446b75e69c"
      const specificUserId = '6752eb529b14a3446b75e69c';
      const specificUser = users.find((user: any) => user.id === specificUserId);

      // Verify the specific user exists
      expect(specificUser).toBeDefined();
      if (!specificUser) {
        const availableUserIds = users.map((u: any) => u.id).join(', ');
        fail(
          `Expected to find user with ID "${specificUserId}", but it was not found. Available user IDs: ${availableUserIds}`
        );
        return; // TypeScript flow control
      }

      // Verify full_name property
      expect(specificUser.full_name).toBe(
        'SaaS Connectors',
        `Expected user full_name to be "SaaS Connectors", but got "${specificUser.full_name}"`
      );

      // Verify username property
      expect(specificUser.username).toBe(
        'examplesaas1',
        `Expected user username to be "examplesaas1", but got "${specificUser.username}"`
      );

      // Verify email property
      expect(specificUser.email).toBe(
        'example+saas@codeplain.ai',
        `Expected user email to be "example+saas@codeplain.ai", but got "${specificUser.email}"`
      );
    }, 60000);
  });
});