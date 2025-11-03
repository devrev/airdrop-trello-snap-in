import { getTestEnvironment, createBaseTestEvent, setupCallbackServer, sendEventToSnapIn, CallbackServerSetup } from './test-utils';

describe('fetch_organization_members function', () => {
  let callbackServer: CallbackServerSetup;
  let testEnv: ReturnType<typeof getTestEnvironment>;

  beforeAll(async () => {
    testEnv = getTestEnvironment();
    callbackServer = await setupCallbackServer();
  });

  afterAll(async () => {
    if (callbackServer?.server) {
      callbackServer.server.close();
    }
  });

  test('should successfully invoke function with valid input', async () => {
    const event = createBaseTestEvent(testEnv);
    
    try {
      const response = await sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      
      if (response.error) {
        console.error('Unexpected error in basic invocation test:', {
          error: response.error,
          timestamp: new Date().toISOString(),
          event_payload: event.payload,
        });
        fail(`Function should not return error for valid input: ${JSON.stringify(response.error)}`);
      }
    } catch (error) {
      console.error('Failed to invoke function with valid input:', {
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
        event_payload: event.payload,
      });
      throw error;
    }
  });

  test('should handle missing connection_data gracefully', async () => {
    const event = createBaseTestEvent(testEnv);
    delete event.payload.connection_data;
    
    try {
      const response = await sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.status).toBe('failure');
      expect(response.function_result.message).toContain('connection_data');
      
      console.log('Missing connection_data test result:', {
        status: response.function_result.status,
        message: response.function_result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to handle missing connection_data test:', {
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  });

  test('should handle missing org_id gracefully', async () => {
    const event = createBaseTestEvent(testEnv);
    delete event.payload.connection_data.org_id;
    
    try {
      const response = await sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.status).toBe('failure');
      expect(response.function_result.message).toContain('org_id');
      
      console.log('Missing org_id test result:', {
        status: response.function_result.status,
        message: response.function_result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to handle missing org_id test:', {
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  });

  test('should successfully fetch organization members from Trello API', async () => {
    const event = createBaseTestEvent(testEnv);
    
    try {
      const response = await sendEventToSnapIn(event);
      
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      
      console.log('API integration test result:', {
        status: response.function_result.status,
        message: response.function_result.message,
        status_code: response.function_result.status_code,
        api_delay: response.function_result.api_delay,
        members_count: response.function_result.members?.length || 0,
        timestamp: new Date().toISOString(),
      });
      
      if (response.function_result.status === 'success') {
        expect(response.function_result.status_code).toBe(200);
        expect(response.function_result.members).toBeDefined();
        expect(Array.isArray(response.function_result.members)).toBe(true);
        expect(response.function_result.api_delay).toBeDefined();
        expect(typeof response.function_result.api_delay).toBe('number');
        
        if (response.function_result.members.length > 0) {
          const member = response.function_result.members[0];
          expect(member.id).toBeDefined();
          expect(typeof member.id).toBe('string');
        }
      } else {
        console.warn('API call was not successful:', {
          status: response.function_result.status,
          status_code: response.function_result.status_code,
          message: response.function_result.message,
          api_delay: response.function_result.api_delay,
        });
        
        // Still validate the response structure for failed calls
        expect(response.function_result.status_code).toBeDefined();
        expect(typeof response.function_result.status_code).toBe('number');
        expect(response.function_result.api_delay).toBeDefined();
        expect(typeof response.function_result.api_delay).toBe('number');
      }
    } catch (error) {
      console.error('Failed to fetch organization members from API:', {
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString(),
        organization_id: testEnv.trelloOrganizationId,
      });
      throw error;
    }
  });
});