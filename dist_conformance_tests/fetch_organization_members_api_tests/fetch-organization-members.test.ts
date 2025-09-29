import {
  getTestEnvironment,
  setupCallbackServer,
  teardownServers,
  callSnapInFunction,
  TestServers,
} from './test-utils';
import testEventPayload from './test-event-payload.json';

describe('fetch_organization_members function', () => {
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

  describe('Trivial: Basic function invocation', () => {
    it('should return expected response structure', async () => {
      const event = createTestEvent();
      const response = await callSnapInFunction('fetch_organization_members', event);

      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(typeof response.function_result.status_code).toBe('number');
      expect(typeof response.function_result.api_delay).toBe('number');
      expect(typeof response.function_result.message).toBe('string');
    }, 30000);
  });

  describe('Simple: Successful organization members fetching', () => {
    it('should successfully fetch organization members with valid credentials', async () => {
      const event = createTestEvent();
      const response = await callSnapInFunction('fetch_organization_members', event);

      expect(response.function_result.status_code).toBe(200);
      expect(response.function_result.api_delay).toBe(0);
      expect(response.function_result.message).toContain('Successfully fetched organization members');
      expect(Array.isArray(response.function_result.members)).toBe(true);
    }, 30000);
  });

  describe('Complex: Error handling scenarios', () => {
    it('should handle missing connection data gracefully', async () => {
      const event = createTestEvent({
        payload: {
          ...testEventPayload.payload,
          connection_data: undefined,
        },
      });

      const response = await callSnapInFunction('fetch_organization_members', event);

      expect(response.function_result.status_code).toBe(0);
      expect(response.function_result.api_delay).toBe(0);
      expect(response.function_result.message).toContain('Missing connection data');
      expect(response.function_result.members).toBeUndefined();
    }, 30000);

    it('should handle missing organization ID gracefully', async () => {
      const event = createTestEvent();
      delete event.payload.connection_data.org_id;

      const response = await callSnapInFunction('fetch_organization_members', event);

      expect(response.function_result.status_code).toBe(0);
      expect(response.function_result.api_delay).toBe(0);
      expect(response.function_result.message).toContain('Missing organization ID');
      expect(response.function_result.members).toBeUndefined();
    }, 30000);

    it('should handle invalid credentials gracefully', async () => {
      const event = createTestEvent();
      event.payload.connection_data.key = 'key=invalid_key&token=invalid_token';

      const response = await callSnapInFunction('fetch_organization_members', event);

      expect(response.function_result.status_code).toBeGreaterThanOrEqual(400);
      expect(response.function_result.message).toContain('failed');
      expect(response.function_result.members).toBeUndefined();
    }, 30000);
  });
});