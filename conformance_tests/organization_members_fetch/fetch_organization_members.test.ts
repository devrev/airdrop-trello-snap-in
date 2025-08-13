import {
  createTestEvent,
  createTrelloConnectionData,
  invokeFunction,
} from './utils/test-utils';

describe('fetch_organization_members Function Tests', () => {
  // Basic test to verify the function exists and can be invoked
  test('function exists and can be invoked', async () => {
    // Create a basic test event
    const event = createTestEvent('fetch_organization_members', {
      connection_data: createTrelloConnectionData(),
    });

    // Invoke the function
    const result = await invokeFunction(event);

    // Verify the function returned a result
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.function_result).toBeDefined();
  });

  // Input validation test
  test('validates required input parameters', async () => {
    // Create an event without connection data
    const event = createTestEvent('fetch_organization_members', {
      // Provide an empty object as connection_data instead of omitting it entirely
      connection_data: {}
    });

    // Invoke the function
    const result = await invokeFunction(event);

    // Verify the function returned an error
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(false);
    expect(result.function_result.message).toContain('Connection data is missing or invalid');
  });

  // Authentication test
  test('uses authentication credentials correctly', async () => {
    // Create connection data with invalid credentials
    const invalidConnectionData = {
      key: 'key=invalid&token=invalid',
      key_type: 'api_key',
      org_id: process.env.TRELLO_ORGANIZATION_ID || 'invalid',
      org_name: 'Test Organization',
    };

    const event = createTestEvent('fetch_organization_members', {
      connection_data: invalidConnectionData,
    });

    // Invoke the function
    const result = await invokeFunction(event);

    // Verify the function returned an authentication error
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(false);
    expect(result.function_result.message).toContain('Failed to fetch organization members');
  });

  // Functional test
  test('fetches organization members correctly', async () => {
    // Create a test event with valid connection data
    const event = createTestEvent('fetch_organization_members', {
      connection_data: createTrelloConnectionData(),
    });

    // Invoke the function
    const result = await invokeFunction(event);

    // Verify the function returned members data
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(true);
    expect(result.function_result.message).toContain('Successfully fetched');
    expect(result.function_result.members).toBeDefined();
    expect(Array.isArray(result.function_result.members)).toBe(true);
    
    // Verify the structure of the first member if available
    if (result.function_result.members.length > 0) {
      const firstMember = result.function_result.members[0];
      expect(firstMember.id).toBeDefined();
      expect(firstMember.username).toBeDefined();
    }
  });

  // Error handling test
  test('handles missing organization ID correctly', async () => {
    // Create connection data without organization ID
    const connectionData = createTrelloConnectionData();
    connectionData.org_id = '';

    const event = createTestEvent('fetch_organization_members', {
      connection_data: connectionData,
    });

    // Invoke the function
    const result = await invokeFunction(event);

    // Verify the function returned an appropriate error
    expect(result.function_result).toBeDefined();
    expect(result.function_result.success).toBe(false);
    expect(result.function_result.message).toContain('Organization ID is missing');
  });
});