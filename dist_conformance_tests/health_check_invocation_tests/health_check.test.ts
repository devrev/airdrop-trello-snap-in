import { Server } from 'http';
import { setupCallbackServer, closeCallbackServer, sendSyncRequest, createBaseEventPayload } from './test-utils';

describe('Health Check Function Invocation Tests', () => {
  let callbackServer: Server;

  beforeAll(async () => {
    // Set up callback server
    const { server } = await setupCallbackServer(8002);
    callbackServer = server;
  });

  afterAll(async () => {
    // Close callback server
    if (callbackServer) {
      await closeCallbackServer(callbackServer);
    }
  });

  describe('Test 1: health_check_function_invocation_success', () => {
    it('should successfully invoke the health_check function and return HTTP 200', async () => {
      // Arrange
      const requestId = 'test-request-id-001';
      const eventPayload = createBaseEventPayload('health_check', requestId);

      // Act
      const response = await sendSyncRequest(eventPayload);

      // Assert
      expect(response.status).toBe(200);
    }, 30000);
  });

  describe('Test 2: health_check_function_response_structure', () => {
    it('should return a response with the correct structure including success, message, function_name, and request_id', async () => {
      // Arrange
      const requestId = 'test-request-id-002';
      const functionName = 'health_check';
      const eventPayload = createBaseEventPayload(functionName, requestId);

      // Act
      const response = await sendSyncRequest(eventPayload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      
      const responseData = response.data;
      
      // Verify the response structure
      expect(responseData).toHaveProperty('function_result');
      expect(responseData.function_result).toBeDefined();
      
      const functionResult = responseData.function_result;
      
      // Verify success field
      expect(functionResult).toHaveProperty('success');
      expect(functionResult.success).toBe(true);
      
      // Verify message field
      expect(functionResult).toHaveProperty('message');
      expect(typeof functionResult.message).toBe('string');
      expect(functionResult.message.length).toBeGreaterThan(0);
      
      // Verify function_name field matches the request
      expect(functionResult).toHaveProperty('function_name');
      expect(functionResult.function_name).toBe(functionName);
      
      // Verify request_id field matches the request
      expect(functionResult).toHaveProperty('request_id');
      expect(functionResult.request_id).toBe(requestId);
    }, 30000);
  });

  describe('Test 3: health_check_function_processes_first_event_only', () => {
    it('should process the single event correctly and return response with metadata from that event', async () => {
      // Arrange
      const requestId = 'test-request-id-003';
      const functionName = 'health_check';
      const eventPayload = createBaseEventPayload(functionName, requestId);

      // Act
      const response = await sendSyncRequest(eventPayload);

      // Assert
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      
      const responseData = response.data;
      expect(responseData).toHaveProperty('function_result');
      
      const functionResult = responseData.function_result;
      
      // Verify that the function processed the event correctly
      expect(functionResult.success).toBe(true);
      
      // Verify that metadata from the single event is present in the response
      expect(functionResult.function_name).toBe(functionName);
      expect(functionResult.request_id).toBe(requestId);
      
      // Verify that the message indicates successful processing
      expect(functionResult.message).toBeDefined();
      expect(typeof functionResult.message).toBe('string');
    }, 30000);
  });
});