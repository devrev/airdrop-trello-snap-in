import { Server } from 'http';
import {
  createCallbackServer,
  sendEventToSnapInServer,
  replaceCredentialsInPayload,
  getRequiredEnvVars
} from './utils';

// Import event template
import eventTemplate from './event-template.json';

describe('fetch_organization_members function', () => {
  let callbackServer: Server;
  let callbackPromise: Promise<any>;
  
  beforeEach(async () => {
    // Set up the callback server before each test
    const serverSetup = await createCallbackServer();
    callbackServer = serverSetup.server;
    callbackPromise = serverSetup.callbackPromise;
  });
  
  afterEach(() => {
    // Clean up the callback server after each test
    if (callbackServer) {
      callbackServer.close();
    }
  });

  // Test 1: Verify the function can be invoked and returns a response
  test('should be invokable and return a response', async () => {
    // Prepare the event with credentials
    const event = replaceCredentialsInPayload(eventTemplate);
    
    // Send the event to the snap-in server
    const response = await sendEventToSnapInServer(event);
    
    // Verify the response structure
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.status_code).toBeDefined();
    expect(response.function_result.message).toBeDefined();
  });

  // Test 2: Verify the function handles missing organization ID correctly
  test('should handle missing organization ID correctly', async () => {
    // Prepare the event with credentials but remove org_id
    const event = replaceCredentialsInPayload(eventTemplate);
    delete event.payload.connection_data.org_id;
    
    // Send the event to the snap-in server
    const response = await sendEventToSnapInServer(event);
    
    // Verify the error response
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(false);
    expect(response.function_result.message).toContain('Missing organization ID');
  });

  // Test 3: Verify the function correctly fetches organization members with valid credentials
  test('should fetch organization members with valid credentials', async () => {
    try {
      // Ensure environment variables are set
      getRequiredEnvVars();
      
      // Prepare the event with credentials
      const event = replaceCredentialsInPayload(eventTemplate);
      
      // Send the event to the snap-in server
      const response = await sendEventToSnapInServer(event);
      
      // Verify successful response
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      expect(response.function_result.status_code).toBe(200);
      expect(response.function_result.members).toBeDefined();
      expect(Array.isArray(response.function_result.members)).toBe(true);
      
      // Verify members have expected properties
      if (response.function_result.members.length > 0) {
        const firstMember = response.function_result.members[0];
        expect(firstMember.id).toBeDefined();
        expect(firstMember.username).toBeDefined();
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing required environment variables')) {
        console.warn('Skipping test due to missing environment variables');
        return;
      }
      throw error;
    }
  });

  // Test 4: Verify the function handles invalid API credentials gracefully
  test('should handle invalid API credentials gracefully', async () => {
    // Prepare the event with invalid credentials
    const event = JSON.parse(JSON.stringify(eventTemplate));
    event.payload.connection_data.key = 'key=invalid_key&token=invalid_token';
    event.payload.connection_data.org_id = 'invalid_org_id';
    
    // Send the event to the snap-in server
    const response = await sendEventToSnapInServer(event);
    
    // Verify error response
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(false);
    expect(response.function_result.status_code).not.toBe(200);
    expect(response.function_result.message).toContain('Authentication failed');
  });
});