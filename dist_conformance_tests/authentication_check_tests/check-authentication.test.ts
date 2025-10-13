import { getTestCredentials, createAuthCheckEventPayload, callSnapInFunction } from './test-utils';

describe('check_authentication function', () => {
  let testCredentials: ReturnType<typeof getTestCredentials>;

  beforeAll(() => {
    try {
      testCredentials = getTestCredentials();
    } catch (error) {
      throw new Error(`Failed to load test credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  describe('Trivial: Invalid credentials', () => {
    it('should return failure status for missing API key', async () => {
      const invalidConnectionData = `key=&token=${testCredentials.token}`;
      const eventPayload = createAuthCheckEventPayload(invalidConnectionData);

      const result = await callSnapInFunction(eventPayload);

      expect(result).toBeDefined();
      expect(result.function_result).toBeDefined();
      expect(result.function_result.status).toBe('failure');
      expect(result.function_result.status_code).toBeGreaterThanOrEqual(400);
      expect(result.function_result.api_delay).toBeDefined();
      expect(result.function_result.message).toBeDefined();
      expect(result.function_result.timestamp).toBeDefined();
      expect(typeof result.function_result.message).toBe('string');
      expect(result.function_result.message.length).toBeGreaterThan(0);
    }, 30000);

    it('should return failure status for missing token', async () => {
      const invalidConnectionData = `key=${testCredentials.apiKey}&token=`;
      const eventPayload = createAuthCheckEventPayload(invalidConnectionData);

      const result = await callSnapInFunction(eventPayload);

      expect(result).toBeDefined();
      expect(result.function_result).toBeDefined();
      expect(result.function_result.status).toBe('failure');
      expect(result.function_result.status_code).toBeGreaterThanOrEqual(400);
      expect(result.function_result.api_delay).toBeDefined();
      expect(result.function_result.message).toBeDefined();
      expect(result.function_result.timestamp).toBeDefined();
      expect(typeof result.function_result.message).toBe('string');
      expect(result.function_result.message.length).toBeGreaterThan(0);
    }, 30000);

    it('should return failure status for invalid API key', async () => {
      const invalidConnectionData = `key=invalid_api_key&token=${testCredentials.token}`;
      const eventPayload = createAuthCheckEventPayload(invalidConnectionData);

      const result = await callSnapInFunction(eventPayload);

      expect(result).toBeDefined();
      expect(result.function_result).toBeDefined();
      expect(result.function_result.status).toBe('failure');
      expect(result.function_result.status_code).toBeGreaterThanOrEqual(400);
      expect(result.function_result.api_delay).toBeDefined();
      expect(result.function_result.message).toBeDefined();
      expect(result.function_result.timestamp).toBeDefined();
      expect(typeof result.function_result.message).toBe('string');
      expect(result.function_result.message.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Simple: Valid credentials', () => {
    it('should return success status for valid credentials', async () => {
      const validConnectionData = `key=${testCredentials.apiKey}&token=${testCredentials.token}`;
      const eventPayload = createAuthCheckEventPayload(validConnectionData);

      const result = await callSnapInFunction(eventPayload);

      expect(result).toBeDefined();
      expect(result.function_result).toBeDefined();
      expect(result.function_result.status).toBe('success');
      expect(result.function_result.status_code).toBe(200);
      expect(result.function_result.api_delay).toBeDefined();
      expect(result.function_result.message).toBeDefined();
      expect(result.function_result.timestamp).toBeDefined();
      expect(result.function_result.member_info).toBeDefined();
      expect(result.function_result.member_info.id).toBeDefined();
      expect(typeof result.function_result.member_info.id).toBe('string');
      expect(result.function_result.member_info.id.length).toBeGreaterThan(0);
      expect(typeof result.function_result.message).toBe('string');
      expect(result.function_result.message).toContain('successful');
    }, 30000);
  });

  describe('More Complex: Edge cases', () => {
    it('should handle malformed connection data gracefully', async () => {
      const malformedConnectionData = 'invalid_format_data';
      const eventPayload = createAuthCheckEventPayload(malformedConnectionData);

      const result = await callSnapInFunction(eventPayload);

      expect(result).toBeDefined();
      expect(result.function_result).toBeDefined();
      expect(result.function_result.status).toBe('failure');
      expect(result.function_result.status_code).toBeGreaterThanOrEqual(400);
      expect(result.function_result.api_delay).toBeDefined();
      expect(result.function_result.message).toBeDefined();
      expect(result.function_result.timestamp).toBeDefined();
      expect(typeof result.function_result.message).toBe('string');
      expect(result.function_result.message.length).toBeGreaterThan(0);
    }, 30000);

    it('should handle empty connection data', async () => {
      const emptyConnectionData = '';
      const eventPayload = createAuthCheckEventPayload(emptyConnectionData);

      const result = await callSnapInFunction(eventPayload);

      expect(result).toBeDefined();
      expect(result.function_result).toBeDefined();
      expect(result.function_result.status).toBe('failure');
      expect(result.function_result.status_code).toBeGreaterThanOrEqual(400);
      expect(result.function_result.api_delay).toBeDefined();
      expect(result.function_result.message).toBeDefined();
      expect(result.function_result.timestamp).toBeDefined();
      expect(typeof result.function_result.message).toBe('string');
      expect(result.function_result.message.length).toBeGreaterThan(0);
    }, 30000);
  });
});